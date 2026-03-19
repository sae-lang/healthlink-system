import { CASE_STATUS } from "../constants/enums.js";
import { AppointmentRepository } from "../repositories/appointmentRepository.js";
import { CaseRepository, type CaseRecord } from "../repositories/caseRepository.js";
import { RecommendationRepository } from "../repositories/recommendationRepository.js";
import { UserRepository } from "../repositories/userRepository.js";
import { RECOMMENDATION_SOURCE } from "../constants/enums.js";
import { ApiError } from "../utils/apiError.js";

const caseRepository = new CaseRepository();
const recommendationRepository = new RecommendationRepository();
const userRepository = new UserRepository();
const appointmentRepository = new AppointmentRepository();

const mapCase = (caseRecord: CaseRecord) => {
  const patient = userRepository.findById(caseRecord.user_id);
  const doctor = caseRecord.doctor_id ? userRepository.findById(caseRecord.doctor_id) : undefined;
  const recommendations = recommendationRepository.listByCaseId(caseRecord.id);
  const appointments = appointmentRepository.listByPatientId(caseRecord.user_id).filter((item) => item.case_id === caseRecord.id);

  return {
    id: caseRecord.id,
    userId: caseRecord.user_id,
    patientName: patient?.name ?? "Unknown Patient",
    doctorId: caseRecord.doctor_id,
    doctorName: doctor?.name ?? null,
    symptoms: JSON.parse(caseRecord.symptoms_json) as string[],
    triageLevel: caseRecord.triage_level,
    aiResult: caseRecord.ai_result ? JSON.parse(caseRecord.ai_result) : null,
    status: caseRecord.status,
    createdAt: caseRecord.created_at,
    updatedAt: caseRecord.updated_at,
    reviewed: caseRecord.status !== CASE_STATUS.PENDING_REVIEW,
    recommendations: recommendations.map((item) => ({
      id: item.id,
      source: item.source,
      content: item.content,
      createdAt: item.created_at,
    })),
    appointments: appointments.map((item) => ({
      id: item.id,
      date: item.date,
      status: item.status,
      doctorId: item.doctor_id,
    })),
  };
};

export class CaseService {
  listForPatient(patientId: string) {
    return caseRepository.listByUserId(patientId).map(mapCase);
  }

  getPatientCase(patientId: string, caseId: string) {
    const caseRecord = caseRepository.findById(caseId);
    if (!caseRecord || caseRecord.user_id !== patientId) {
      throw new ApiError(404, "Case not found");
    }
    return mapCase(caseRecord);
  }

  listForDoctor() {
    return caseRepository.listForDoctors().map(mapCase);
  }

  getDoctorCase(caseId: string) {
    const caseRecord = caseRepository.findById(caseId);
    if (!caseRecord) {
      throw new ApiError(404, "Case not found");
    }
    return mapCase(caseRecord);
  }

  reviewCase(input: {
    caseId: string;
    doctorId: string;
    recommendation: string;
    recommendAppointment: boolean;
  }) {
    const caseRecord = caseRepository.findById(input.caseId);
    if (!caseRecord) {
      throw new ApiError(404, "Case not found");
    }

    caseRepository.updateReview({
      id: input.caseId,
      doctorId: input.doctorId,
      status: input.recommendAppointment ? CASE_STATUS.APPOINTMENT_RECOMMENDED : CASE_STATUS.REVIEWED,
    });

    recommendationRepository.create({
      caseId: input.caseId,
      source: RECOMMENDATION_SOURCE.DOCTOR,
      content: input.recommendation,
    });

    return this.getDoctorCase(input.caseId);
  }
}
