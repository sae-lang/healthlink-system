import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  History, 
  Settings, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  LogOut, 
  Globe, 
  Phone, 
  Lock,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Info,
  User as UserIcon,
  Bell,
  Stethoscope,
  FileText,
  Calendar,
  MessageCircle,
  MessageSquare,
  LayoutDashboard,
  UserCircle,
  User,
  Heart,
  Camera,
  Check,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from './store';
import translations from './translations.json';
import { runRules } from './engine';
import { analyzeSymptomsAI } from './services/geminiService';
import { cn, formatDate, formatRelativeTime } from './utils';
import { auth, db } from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  setDoc, 
  doc, 
  getDoc,
  orderBy,
  FirestoreError,
  getDocFromServer,
  serverTimestamp
} from 'firebase/firestore';

// --- Types ---
type Screen = 'auth' | 'home' | 'checker' | 'results' | 'history' | 'settings' | 'messages' | 'profile';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const { language, setLanguage } = useStore();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<Screen>('auth');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [fullName, setFullName] = useState('');
  const [userData, setUserData] = useState<any>(null);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [customSymptom, setCustomSymptom] = useState('');
  const [lastResult, setLastResult] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t.good_morning || 'Good Morning';
    if (hour < 18) return t.good_afternoon || 'Good Afternoon';
    return t.good_evening || 'Good Evening';
  };

  const t = (translations as any)[language];

  // --- Auth & Firestore Connection Test ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthReady(true);
      if (firebaseUser) {
        setCurrentScreen('home');
        // Fetch user data
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        } catch (err) {
          console.error("Error fetching user data", err);
        }
      } else {
        setCurrentScreen('auth');
        setUserData(null);
      }
    });

    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();

    return () => unsubscribe();
  }, []);

  // --- Fetch Reports ---
  useEffect(() => {
    if (!user || !isAuthReady) return;

    const q = query(
      collection(db, 'reports'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedReports = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReports(fetchedReports);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'reports');
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

  // --- Auth Logic ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user profile exists, if not create it
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        const newUserData = {
          uid: user.uid,
          phoneNumber: user.phoneNumber || user.email || '',
          displayName: user.displayName || 'User',
          language: language,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', user.uid), newUserData);
        setUserData(newUserData);
      } else {
        setUserData(userDoc.data());
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;
        // Create user profile in Firestore
        const newUserData = {
          uid: newUser.uid,
          displayName: fullName || 'User',
          phoneNumber: email, // Using email as phone for mock simplicity
          language: language,
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, 'users', newUser.uid), newUserData);
        setUserData(newUserData);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error("Logout error", err);
    }
  };

  // --- Symptom Checker Logic ---
  const symptomsList = [
    { id: 'fever', label: t.fever },
    { id: 'headache', label: t.headache },
    { id: 'cough', label: t.cough },
    { id: 'fatigue', label: t.fatigue },
    { id: 'nausea', label: t.nausea },
    { id: 'chills', label: t.chills },
    { id: 'sore_throat', label: t.sore_throat },
    { id: 'swelling', label: t.swelling },
    { id: 'persistent_cough', label: t.persistent_cough },
    { id: 'blurred_vision', label: t.blurred_vision },
    { id: 'skin_changes', label: t.skin_changes },
    { id: 'digestive_problems', label: t.digestive_problems },
  ];

  const toggleSymptom = (id: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const handleCheck = async () => {
    if ((selectedSymptoms.length === 0 && !customSymptom.trim()) || !user) return;
    setLoading(true);
    setLoadingText(t.analyzing);
    
    let result = runRules(selectedSymptoms);
    
    // If the rule-based engine returns Unknown, use AI analysis
    if (result.condition === "Unknown") {
      try {
        setLoadingText("AI is analyzing your symptoms...");
        const aiResult = await analyzeSymptomsAI(
          selectedSymptoms.map(s => (symptomsList.find(sl => sl.id === s)?.label) || s), 
          customSymptom.trim(),
          language
        );
        result = aiResult;
      } catch (err) {
        console.error("AI Analysis failed, falling back to rule-based result", err);
      }
    }
    
    const reportData = {
      id: uuidv4(),
      userId: user.uid,
      symptoms: selectedSymptoms,
      customSymptom: customSymptom.trim(),
      condition: result.condition,
      recommendation: result.recommendation,
      triageLevel: result.triageLevel,
      timestamp: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, 'reports'), reportData);
      setLastResult(reportData);
      setCurrentScreen('results');
      setSelectedSymptoms([]);
      setCustomSymptom('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'reports');
    } finally {
      setLoading(false);
      setLoadingText('');
    }
  };

  // --- Render Helpers ---
  const renderHeader = (title: string, showBack = false) => (
    <div className="sticky top-0 z-30 bg-blue-600 px-6 py-5 flex items-center justify-between shadow-lg shadow-blue-900/10">
      <div className="flex items-center">
        {showBack && (
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentScreen('home')} 
            className="mr-5 p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all border border-white/20"
          >
            <ArrowLeft size={18} className="text-white" strokeWidth={2.5} />
          </motion.button>
        )}
        <h1 className="text-xl font-bold text-white tracking-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-4">
        {loading && (
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
            <RefreshCw size={16} className="animate-spin text-white" />
          </div>
        )}
        <motion.div 
          whileHover={{ rotate: 15 }}
          className="w-12 h-12 rounded-[1.25rem] bg-white flex items-center justify-center shadow-xl relative group"
        >
          <Activity size={22} className="text-blue-600 relative z-10" strokeWidth={2.5} />
        </motion.div>
      </div>
    </div>
  );

  const renderBottomNav = () => (
    <div className="fixed bottom-8 left-6 right-6 z-40">
      <div className="bg-slate-900/95 backdrop-blur-3xl border border-white/10 flex justify-around items-center p-3 rounded-[3rem] max-w-md mx-auto shadow-[0_25px_60px_rgba(0,0,0,0.3)]">
        {[
          { id: 'home', icon: LayoutDashboard, label: t.home },
          { id: 'history', icon: History, label: t.history },
          { id: 'messages', icon: MessageCircle, label: t.messages },
          { id: 'profile', icon: UserCircle, label: t.profile }
        ].map((item) => (
          <button 
            key={item.id}
            onClick={() => setCurrentScreen(item.id as any)}
            className={cn(
              "relative flex flex-col items-center p-3 transition-all duration-500 rounded-2xl group",
              currentScreen === item.id ? "text-white" : "text-slate-500 hover:text-slate-300"
            )}
          >
            {currentScreen === item.id && (
              <motion.div 
                layoutId="nav-active"
                className="absolute inset-0 bg-white/10 rounded-2xl"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <item.icon size={22} strokeWidth={currentScreen === item.id ? 2.5 : 2} className="relative z-10" />
            <span className="text-[8px] mt-2 font-bold tracking-[0.2em] uppercase relative z-10 opacity-60">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 max-w-md mx-auto relative pb-20 overflow-x-hidden">
      <AnimatePresence mode="wait">
        {/* --- Auth Screen --- */}
        {currentScreen === 'auth' && (
          <motion.div 
            key="auth"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden bg-white"
          >
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-500/5 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-slate-500/5 rounded-full blur-[120px]" />

            <div className="w-full max-w-sm relative z-10">
              <div className="flex flex-col items-center mb-16">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-28 h-28 bg-white rounded-[3rem] flex items-center justify-center mb-8 shadow-2xl shadow-slate-200/50 border-2 border-slate-50 relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-white rounded-[3rem] opacity-50" />
                  <Activity size={56} className="text-blue-600 relative z-10" strokeWidth={1.5} />
                </motion.div>
                <h2 className="text-4xl font-bold text-slate-900 tracking-tighter mb-3">{t.welcome}</h2>
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em] opacity-60">HealthLink Diagnostics</p>
              </div>

              <form onSubmit={handleAuth} className="space-y-8">
                <div className="space-y-5">
                  {isRegistering && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-2.5"
                    >
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Full Name</label>
                      <div className="relative group">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                          <UserIcon size={20} strokeWidth={1.5} />
                        </div>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="John Doe"
                          className="w-full pl-14 pr-6 py-5 bg-slate-50/50 border-2 border-transparent rounded-[2rem] outline-none focus:bg-white focus:border-blue-500/20 focus:ring-8 focus:ring-blue-500/5 transition-all text-sm font-bold text-slate-900 shadow-inner"
                          required={isRegistering}
                        />
                      </div>
                    </motion.div>
                  )}

                  <div className="space-y-2.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Email Address</label>
                    <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                        <UserIcon size={20} strokeWidth={1.5} />
                      </div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full pl-14 pr-6 py-5 bg-slate-50/50 border-2 border-transparent rounded-[2rem] outline-none focus:bg-white focus:border-blue-500/20 focus:ring-8 focus:ring-blue-500/5 transition-all text-sm font-bold text-slate-900 shadow-inner"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1">Password</label>
                    <div className="relative group">
                      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                        <Lock size={20} strokeWidth={1.5} />
                      </div>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-14 pr-6 py-5 bg-slate-50/50 border-2 border-transparent rounded-[2rem] outline-none focus:bg-white focus:border-blue-500/20 focus:ring-8 focus:ring-blue-500/5 transition-all text-sm font-bold text-slate-900 shadow-inner"
                        required
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-rose-500 text-[10px] text-center font-bold uppercase tracking-widest bg-rose-50/50 py-4 rounded-2xl border border-rose-100/50"
                  >
                    {error}
                  </motion.p>
                )}

                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full py-5 bg-emerald-600 text-white rounded-[2rem] font-bold text-xs tracking-[0.2em] uppercase shadow-2xl shadow-emerald-900/20 hover:bg-emerald-500 transition-all flex items-center justify-center gap-3"
                >
                  {loading ? <RefreshCw size={20} className="animate-spin" /> : (isRegistering ? t.register : t.login)}
                </motion.button>
              </form>

              <div className="relative w-full py-12">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100"></div>
                </div>
                <div className="relative flex justify-center text-[10px]">
                  <span className="px-6 bg-white text-slate-400 font-bold uppercase tracking-[0.2em]">Or continue with</span>
                </div>
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full bg-white border-2 border-slate-50 text-slate-700 py-5 rounded-[2rem] font-bold shadow-xl shadow-slate-100/50 hover:bg-slate-50 transition-all flex items-center justify-center gap-4 disabled:opacity-50"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-widest">Google Account</span>
              </motion.button>

              <button 
                onClick={() => setIsRegistering(!isRegistering)}
                className="w-full mt-12 text-blue-600 hover:text-blue-800 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors"
              >
                {isRegistering ? t.has_account : t.no_account}
              </button>
            </div>
          </motion.div>
        )}

        {/* --- Home Screen --- */}
        {currentScreen === 'home' && (
          <motion.div 
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col pb-32"
          >
            {/* 1. Top Header */}
            <div className="p-6 flex justify-between items-center bg-blue-600 sticky top-0 z-20 shadow-lg shadow-blue-900/10">
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">{t.hello}, {userData?.displayName?.split(' ')[0] || 'User'}</h1>
                <p className="text-[10px] text-white/70 font-bold uppercase tracking-[0.2em] mt-0.5">{t.stay_healthy}</p>
              </div>
              <div className="flex items-center gap-3">
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative p-3 bg-white/10 rounded-2xl border border-white/20 hover:bg-white/20 transition-colors cursor-pointer group"
                >
                  <Bell size={18} className="text-white" />
                  <span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 border-2 border-blue-600 rounded-full"></span>
                </motion.div>
                <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-lg">
                  <Activity size={20} className="text-blue-600" />
                </div>
              </div>
            </div>

            <div className="px-6 py-8 space-y-10">
              {/* 3. Main Action Grid */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{t.quick_actions}</h2>
                  <div className="h-px flex-1 bg-slate-100 ml-4" />
                </div>
                <div className="grid grid-cols-2 gap-5">
                  {[
                    { id: 'checker', icon: Stethoscope, label: t.check_symptoms, color: 'blue' },
                    { id: 'history', icon: FileText, label: t.view_results, color: 'blue' },
                    { icon: Calendar, label: t.appointments, color: 'blue' },
                    { icon: MessageCircle, label: t.contact_doctor, color: 'blue' }
                  ].map((action, idx) => (
                    <motion.button 
                      key={idx}
                      whileHover={{ y: -4 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => action.id && setCurrentScreen(action.id as any)}
                      className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-100 transition-all flex flex-col items-center text-center group"
                    >
                      <div className={cn(
                        "w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-all group-hover:scale-110",
                        action.color === 'blue' ? "bg-blue-50 text-blue-600" : "bg-blue-50 text-blue-600"
                      )}>
                        <action.icon size={32} strokeWidth={1.5} />
                      </div>
                      <span className="font-bold text-slate-900 text-xs tracking-tight">{action.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* 4. Quick Health Summary */}
              <div className="bg-blue-600 p-8 rounded-[2.5rem] shadow-2xl shadow-blue-900/10 grid grid-cols-2 gap-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-white/20 transition-colors" />
                <div className="space-y-2 relative z-10">
                  <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{t.last_diagnosis}</p>
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "w-2.5 h-2.5 rounded-full animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.5)]",
                      reports[0]?.triageLevel === 'emergency' ? "bg-rose-400" :
                      reports[0]?.triageLevel === 'urgent' ? "bg-amber-400" :
                      "bg-emerald-400"
                    )}></div>
                    <p className="font-bold text-white text-sm tracking-tight">
                      {reports[0] ? reports[0].condition : t.none_selected}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 relative z-10 border-l border-white/10 pl-8">
                  <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest">{t.last_activity}</p>
                  <p className="text-xs font-bold text-white/80 leading-tight tracking-tight">
                    {reports[0] ? formatRelativeTime(reports[0].timestamp, language) : '--'}
                  </p>
                </div>
              </div>

              {/* 5. Health Tips Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{t.health_tips}</h2>
                  <div className="h-px flex-1 bg-slate-100 ml-4" />
                </div>
                <div className="flex flex-col gap-4">
                  {[t.tip_water, t.tip_nets, t.tip_hands, t.tip_fruits].map((tip, i) => (
                    <motion.div 
                      key={i} 
                      whileHover={{ x: 4 }}
                      className={cn(
                        "px-8 py-5 rounded-[2rem] text-xs font-bold shadow-sm border transition-all",
                        i % 2 === 0 
                          ? "bg-white border-slate-100 text-slate-700 hover:border-slate-200 hover:shadow-md" 
                          : "bg-blue-50/50 border-blue-100/50 text-blue-700 hover:bg-blue-50 hover:border-blue-200 hover:shadow-md"
                      )}
                    >
                      {tip}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
            {renderBottomNav()}
          </motion.div>
        )}

        {/* --- Checker Screen --- */}
        {currentScreen === 'checker' && (
          <motion.div 
            key="checker"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col min-h-screen bg-white"
          >
            {renderHeader(t.check_symptoms, true)}
            <div className="p-6 flex-1 overflow-y-auto pb-32 no-scrollbar">
              <div className="mb-10">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">{t.select_symptoms}</h2>
                <div className="flex items-center gap-2">
                  <div className="h-1 w-8 bg-blue-500 rounded-full" />
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">{t.how_do_you_feel}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 mb-12">
                {symptomsList.map(symptom => (
                    <motion.button
                      key={symptom.id}
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggleSymptom(symptom.id)}
                      className={cn(
                        "group w-full p-6 rounded-[2.5rem] border-2 flex items-center justify-between transition-all relative overflow-hidden",
                        selectedSymptoms.includes(symptom.id) 
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-2xl shadow-emerald-500/20" 
                          : "bg-white border-slate-50 text-slate-600 hover:border-slate-100 hover:bg-slate-50/30"
                      )}
                    >
                      <div className="flex items-center gap-4 relative z-10">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                          selectedSymptoms.includes(symptom.id) ? "bg-white/20 text-white" : "bg-slate-50 text-slate-400 group-hover:bg-white"
                        )}>
                          <Activity size={20} strokeWidth={1.5} />
                        </div>
                        <span className="font-bold text-sm tracking-tight">{symptom.label}</span>
                      </div>
                      <div className={cn(
                        "w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all relative z-10",
                        selectedSymptoms.includes(symptom.id) 
                          ? "bg-white border-white shadow-xl shadow-white/30" 
                          : "border-slate-100 group-hover:border-slate-200"
                      )}>
                        {selectedSymptoms.includes(symptom.id) && <Check className="text-emerald-600" size={16} strokeWidth={3} />}
                      </div>
                    </motion.button>
                ))}
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{t.other_symptoms}</h3>
                  <div className="h-px flex-1 bg-slate-100 ml-4" />
                </div>
                <div className="relative group">
                  <textarea
                    value={customSymptom}
                    onChange={(e) => setCustomSymptom(e.target.value)}
                    placeholder={t.placeholder_other}
                    className="w-full p-6 bg-slate-50/50 border-2 border-slate-100 rounded-[2.5rem] focus:bg-white focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/30 outline-none transition-all min-h-[160px] resize-none text-sm font-bold tracking-tight text-slate-700 placeholder:text-slate-300"
                  />
                  <div className="absolute bottom-6 right-6 text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                    {customSymptom.length} characters
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 bg-white/80 backdrop-blur-xl border-t border-slate-200/40 sticky bottom-0 z-10">
              <motion.button 
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCheck}
                disabled={selectedSymptoms.length === 0 && !customSymptom.trim()}
                className={cn(
                  "w-full py-5 rounded-[2rem] font-bold shadow-2xl transition-all flex items-center justify-center gap-3",
                  (selectedSymptoms.length > 0 || customSymptom.trim()) 
                    ? "bg-slate-900 text-white shadow-slate-900/20 hover:bg-slate-800" 
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                )}
              >
                {loading ? (
                  <>
                    <RefreshCw size={20} className="animate-spin" />
                    <span className="tracking-tight">{loadingText || "Analyzing Symptoms..."}</span>
                  </>
                ) : (
                  <>
                    <span className="tracking-tight">{t.get_result}</span>
                    <ArrowRight size={20} />
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* --- Results Screen --- */}
        {currentScreen === 'results' && lastResult && (() => {
          const isSerious = lastResult.triageLevel === 'emergency' || lastResult.triageLevel === 'urgent';
          return (
            <motion.div 
              key="results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col min-h-screen bg-white"
            >
              {renderHeader(t.results, true)}
              <div className="p-6 flex-1 overflow-y-auto pb-32 no-scrollbar">
                <div className={cn(
                  "p-12 rounded-[3.5rem] mb-12 text-center relative overflow-hidden shadow-2xl transition-all",
                  lastResult.triageLevel === 'emergency' ? "bg-rose-50 border-2 border-rose-100 shadow-rose-500/5" :
                  lastResult.triageLevel === 'urgent' ? "bg-amber-50 border-2 border-amber-100 shadow-amber-500/5" :
                  "bg-emerald-50 border-2 border-emerald-100 shadow-emerald-500/5"
                )}>
                  <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-30 -mr-32 -mt-32 bg-white" />
                  <div className="flex justify-center mb-10">
                    <motion.div 
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 260, damping: 20 }}
                      className={cn(
                        "w-28 h-28 rounded-[2.5rem] flex items-center justify-center shadow-2xl relative z-10",
                        lastResult.triageLevel === 'emergency' ? "bg-white text-rose-600 shadow-rose-200" :
                        lastResult.triageLevel === 'urgent' ? "bg-white text-amber-600 shadow-amber-200" :
                        "bg-white text-emerald-600 shadow-emerald-200"
                      )}
                    >
                      {lastResult.triageLevel === 'emergency' ? <AlertCircle size={56} strokeWidth={1.5} /> :
                       lastResult.triageLevel === 'urgent' ? <AlertCircle size={56} strokeWidth={1.5} /> :
                       <CheckCircle2 size={56} strokeWidth={1.5} />}
                    </motion.div>
                  </div>
                  
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] mb-3 opacity-60 text-slate-500">{t.diagnosis_label}</h3>
                  <h2 className={cn(
                    "text-4xl font-bold mb-6 tracking-tighter relative z-10",
                    lastResult.triageLevel === 'emergency' ? "text-rose-900" : 
                    lastResult.triageLevel === 'urgent' ? "text-amber-900" : 
                    "text-emerald-900"
                  )}>
                    {lastResult.condition}
                  </h2>
                  <div className="h-px w-12 bg-slate-200 mx-auto mb-6" />
                  
                  <div className="space-y-4 relative z-10">
                    <p className={cn(
                      "text-sm font-bold leading-relaxed px-6 tracking-tight max-w-[280px] mx-auto",
                      lastResult.triageLevel === 'emergency' ? "text-rose-600" : 
                      lastResult.triageLevel === 'urgent' ? "text-amber-600" : 
                      "text-emerald-600"
                    )}>
                      {lastResult.triageLevel === 'emergency' ? t.triage_emergency : 
                       lastResult.triageLevel === 'urgent' ? t.triage_urgent : 
                       t.triage_routine}
                    </p>
                    <p className="text-slate-500 text-xs leading-relaxed px-8 opacity-80">
                      {lastResult.recommendation}
                    </p>
                  </div>
                </div>

                <div className="space-y-8">
                  {isSerious && (
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setCurrentScreen('home')} // In a real app, this would go to booking
                      className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex items-center justify-between group cursor-pointer shadow-2xl shadow-slate-900/20 relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/20 transition-colors" />
                      <div className="flex items-center gap-5 relative z-10">
                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Calendar size={28} className="text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-bold tracking-tight mb-0.5">{t.book_appointment}</p>
                          <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest">Next Available: Today</p>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors relative z-10">
                        <ArrowRight size={20} className="text-white" />
                      </div>
                    </motion.div>
                  )}

                  <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-50 shadow-xl shadow-slate-100/50 space-y-8">
                    <div>
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center">
                          <ShieldAlert size={16} className="text-slate-400" />
                        </div>
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{t.severity}</h3>
                      </div>
                      <div className={cn(
                        "inline-flex items-center px-6 py-3 rounded-2xl text-sm font-bold tracking-tight",
                        lastResult.triageLevel === 'emergency' || lastResult.triageLevel === 'urgent' ? "bg-rose-100 text-rose-700" :
                        lastResult.triageLevel === 'routine' ? "bg-amber-100 text-amber-700" :
                        "bg-emerald-100 text-emerald-700"
                      )}>
                        {lastResult.triageLevel === 'emergency' || lastResult.triageLevel === 'urgent' ? t.high :
                         lastResult.triageLevel === 'routine' ? t.medium : t.low}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center">
                          <Activity size={16} className="text-slate-400" />
                        </div>
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Symptoms Reported</h3>
                      </div>
                      <div className="flex flex-wrap gap-2.5">
                        {lastResult.symptoms.map((s: string) => (
                          <span key={s} className="bg-slate-50/50 text-slate-700 px-5 py-2.5 rounded-2xl text-xs font-bold border border-slate-100 tracking-tight">
                            {(symptomsList.find(sl => sl.id === s)?.label) || s}
                          </span>
                        ))}
                        {lastResult.symptoms.length === 0 && !lastResult.customSymptom && (
                          <span className="text-slate-400 italic text-xs font-bold tracking-tight">{t.none_selected}</span>
                        )}
                      </div>
                    </div>
                    
                    {lastResult.customSymptom && (
                      <div className="pt-8 border-t border-slate-50">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center">
                            <FileText size={16} className="text-slate-400" />
                          </div>
                          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{t.additional_notes}</h3>
                        </div>
                        <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                          <p className="text-xs font-bold text-slate-500 italic leading-relaxed tracking-tight">
                            "{lastResult.customSymptom}"
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <motion.div 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="bg-emerald-600 p-8 rounded-[2.5rem] text-white flex items-center justify-between group cursor-pointer shadow-2xl shadow-emerald-900/20 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/20 transition-colors" />
                    <div className="flex items-center gap-5 relative z-10">
                      <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <MessageCircle size={28} className="text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold tracking-tight mb-0.5">{t.contact_doctor}</p>
                        <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest">Available 24/7</p>
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors relative z-10">
                      <ArrowRight size={20} className="text-white" />
                    </div>
                  </motion.div>
                </div>
              </div>
              <div className="p-6 bg-white/80 backdrop-blur-xl border-t border-slate-200/40 sticky bottom-0 z-10">
                <button 
                  onClick={() => setCurrentScreen('home')}
                  className="w-full py-5 rounded-[2rem] bg-white border-2 border-slate-100 text-slate-900 font-bold shadow-sm hover:bg-slate-50 hover:border-slate-200 transition-all active:scale-95 tracking-tight"
                >
                  {t.back_home}
                </button>
              </div>
            </motion.div>
          );
        })()}

        {/* --- History Screen --- */}
        {currentScreen === 'history' && (
          <motion.div 
            key="history"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col min-h-screen bg-white"
          >
            {renderHeader(t.history)}
            <div className="p-6 space-y-5 pb-32 no-scrollbar">
              {reports.length === 0 ? (
                <div className="text-center py-40">
                  <div className="w-24 h-24 bg-slate-50/50 rounded-[3rem] flex items-center justify-center mx-auto mb-8 border-2 border-slate-50 shadow-inner">
                    <History size={40} className="text-slate-200" />
                  </div>
                  <h3 className="text-slate-900 font-bold text-lg tracking-tight mb-2">No Reports Yet</h3>
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em]">Your health history will appear here</p>
                </div>
              ) : (
                reports.map((report, idx) => (
                    <motion.div 
                      key={report.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group bg-white p-6 rounded-[2.5rem] border-2 border-slate-50 shadow-sm hover:border-blue-100 hover:shadow-xl hover:shadow-slate-100/50 transition-all flex items-center justify-between active:scale-[0.98] cursor-pointer"
                    >
                      <div className="flex items-center gap-5">
                        <div className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform",
                          report.triageLevel === 'emergency' ? "bg-rose-50 text-rose-500" :
                          report.triageLevel === 'urgent' ? "bg-amber-50 text-amber-500" : "bg-blue-50 text-blue-500"
                        )}>
                          <Activity size={28} strokeWidth={1.5} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-slate-900 text-sm tracking-tight">
                              {report.triageLevel.charAt(0).toUpperCase() + report.triageLevel.slice(1)} Diagnosis
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-1 bg-slate-300 rounded-full" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatDate(report.timestamp, language)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                        <ChevronRight className="text-slate-300 group-hover:text-blue-500 transition-colors" size={20} />
                      </div>
                    </motion.div>
                ))
              )}
            </div>
            {renderBottomNav()}
          </motion.div>
        )}


        {/* --- Messages Screen --- */}
        {currentScreen === 'messages' && (
          <motion.div 
            key="messages" 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col min-h-screen bg-white"
          >
            {renderHeader(t.messages)}
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
              <div className="w-24 h-24 bg-slate-50/50 rounded-[3rem] flex items-center justify-center mb-8 border-2 border-slate-50 shadow-inner">
                <MessageCircle size={40} className="text-slate-200" />
              </div>
              <h3 className="text-slate-900 font-bold text-lg tracking-tight mb-2">{t.no_messages}</h3>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] max-w-[200px] leading-relaxed mx-auto">Your conversations with doctors will appear here</p>
              
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="mt-10 px-8 py-4 bg-emerald-600 text-white rounded-[2rem] font-bold text-xs tracking-widest uppercase shadow-xl shadow-emerald-900/10"
              >
                Start New Chat
              </motion.button>
            </div>
            {renderBottomNav()}
          </motion.div>
        )}

        {/* --- Profile Screen --- */}
        {currentScreen === 'profile' && (
          <motion.div 
            key="profile" 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            exit={{ opacity: 0, x: -20 }}
            className="flex flex-col min-h-screen bg-white"
          >
            {renderHeader(t.profile)}
            <div className="p-6 space-y-10 pb-32 no-scrollbar">
              <div className="flex flex-col items-center py-10 relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-blue-50 rounded-full blur-3xl opacity-50 -z-10" />
                <div className="relative group">
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="w-32 h-32 bg-white rounded-[3rem] flex items-center justify-center mb-8 border-4 border-white shadow-2xl shadow-slate-200/50 overflow-hidden relative z-10"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-white opacity-50" />
                    <UserIcon size={64} className="text-blue-600 relative z-10" strokeWidth={1.5} />
                  </motion.div>
                  <motion.div 
                    whileHover={{ rotate: 90 }}
                    className="absolute bottom-8 right-0 w-10 h-10 bg-emerald-600 rounded-2xl border-4 border-white flex items-center justify-center shadow-xl z-20 cursor-pointer"
                  >
                    <Settings size={16} className="text-white" />
                  </motion.div>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{userData?.displayName || 'User'}</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1.5">{user?.email}</p>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Account & Preferences</h3>
                  <div className="h-px flex-1 bg-slate-100 ml-4" />
                </div>
                <div className="bg-white rounded-[2.5rem] border-2 border-slate-50 shadow-xl shadow-slate-100/30 overflow-hidden divide-y divide-slate-50">
                  <div className="w-full p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors group cursor-pointer">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-white group-hover:scale-110 transition-all">
                        <Settings size={22} className="text-slate-400 group-hover:text-slate-600" strokeWidth={1.5} />
                      </div>
                      <span className="font-bold text-slate-700 text-sm tracking-tight">{t.account_settings}</span>
                    </div>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-slate-400" />
                  </div>

                  <div className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">
                        <Globe size={22} className="text-slate-400" strokeWidth={1.5} />
                      </div>
                      <span className="font-bold text-slate-700 text-sm tracking-tight">{t.language}</span>
                    </div>
                    <div className="flex bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/50">
                      <button 
                        onClick={() => setLanguage('en')}
                        className={cn(
                          "px-5 py-2 rounded-xl text-[10px] font-bold transition-all tracking-widest", 
                          language === 'en' ? "bg-white text-blue-600 shadow-lg shadow-blue-500/10" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        EN
                      </button>
                      <button 
                        onClick={() => setLanguage('sw')}
                        className={cn(
                          "px-5 py-2 rounded-xl text-[10px] font-bold transition-all tracking-widest", 
                          language === 'sw' ? "bg-white text-blue-600 shadow-lg shadow-blue-500/10" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        SW
                      </button>
                    </div>
                  </div>

                  <button 
                    onClick={handleLogout} 
                    className="w-full p-6 flex items-center justify-between text-rose-500 hover:bg-rose-50/50 transition-colors group"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center group-hover:bg-white group-hover:scale-110 transition-all">
                        <LogOut size={22} strokeWidth={1.5} />
                      </div>
                      <span className="font-bold text-sm tracking-tight">{t.logout}</span>
                    </div>
                    <ChevronRight size={18} className="text-rose-200 group-hover:text-rose-300" />
                  </button>
                </div>
              </div>
            </div>
            {renderBottomNav()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
