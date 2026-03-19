import { APPOINTMENT_STATUS, ROLES } from "../constants/enums.js";
import { AppointmentRepository } from "../repositories/appointmentRepository.js";
import { CaseRepository } from "../repositories/caseRepository.js";
import { UserRepository } from "../repositories/userRepository.js";
import { ApiError } from "../utils/apiError.js";

const appointmentRepository = new AppointmentRepository();
const userRepository = new UserRepository();
const caseRepository = new CaseRepository();

export class AppointmentService {
  create(input: { caseId: string; patientId: string; doctorId?: string; date: string }) {
    const caseRecord = caseRepository.findById(input.caseId);
    if (!caseRecord || caseRecord.user_id !== input.patientId) {
      throw new ApiError(404, "Case not found");
    }

    const doctorId = input.doctorId ?? userRepository.listDoctors()[0]?.id;
    if (!doctorId) {
      throw new ApiError(400, "No doctor is available for booking");
    }

    return appointmentRepository.create({
      caseId: input.caseId,
      patientId: input.patientId,
      doctorId,
      date: input.date,
      status: APPOINTMENT_STATUS.REQUESTED,
    });
  }

  list(user: Express.User) {
    if (user.role === ROLES.DOCTOR) {
      return appointmentRepository.listByDoctorId(user.id);
    }

    return appointmentRepository.listByPatientId(user.id);
  }
}
