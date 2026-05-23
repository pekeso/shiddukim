/**
 * BullMQ queue name for appointment reminder jobs.
 * This constant is shared between the producer (AppointmentsService)
 * and the consumer (AppointmentReminderProcessor).
 */
export const APPOINTMENT_REMINDER_QUEUE = 'appointment-reminders';
