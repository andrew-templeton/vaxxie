
const { NAMESPACE } = process.env

const Response = require('./response')

const faqs = async ({ currentIntent: { name, slots={} } }) => {
  console.log({
    name,
    slots
  })
  switch (name) {
    case `${NAMESPACE}CancelAppointmentsFAQ`:
      return Response(`Usually the email confirmation will contain a link allowing you to reschedule an appointment.
 HEB/Walgreens/CVS: See email confirmation to cancel
 Walmart: Call the pharmacy
 Bell County: Email Vaccine-cancel-bell@outlook.com`)
    case `${NAMESPACE}RescheduleAppointmentsFAQ`:
      return Response('Most providers will not allow you to reschedule your appointment.  You can try calling the provider and seeing if they would be open to it but many times you will need to cancel and make a new appointment.')
    case `${NAMESPACE}TransferAppointmentsFAQ`:
      return Response('Most providers will not allow you to transfer appointments to another person. There have been limited exceptions to this, mainly with pharmacies.  Contact the pharmacy to see if it is something they would do.')
    case `${NAMESPACE}LateApptAppointmentsFAQ`:
      return Response('Call the pharmacy up to inform them.  Their contact number should be in the email confirmation.  Some sites are more flexible than others, try not to miss your scheduled time!')
    case `${NAMESPACE}LeftoverAppointmentsFAQ`:
      return Response('Some providers are keeping waiting lists, but the general feedback is people are showing up for their appointments and there are hardly any leftover vaccines.  It is best if you get a confirmed appointment.')
    case `${NAMESPACE}SecondAppointmentsFAQ`:
      return Response(`Second doses are generally guaranteed from the provider that administered the first dose.  Please contact them if you are due for a second dose and have not received any booking information.

Walgreens and CVS have options for booking second doses as part of their scheduler.
Bell County Second Dose: https://outlook.office365.com/owa/calendar/BeltonBellCountyTexas@bellcountytx.onmicrosoft.com/bookings/`)
    case `${NAMESPACE}DocumentationAppointmentsFAQ`:
      return Response('You will need to bring a photo ID and insurance information.  To save time, print, fill and bring in the consent form that is usually included as a link in your confirmation email.  Be sure to wear a mask to your appointment!')
    case `${NAMESPACE}BookingAppointmentsFAQ`:
      return Response('Generally, you will need the following information to book an appointment: full name, date of birth, email address, phone number.  Some forms require additional information like mailing address and insurance.')
    case `${NAMESPACE}NoFoundAppointmentsFAQ`:
      return Response('Appointment availability changes constantly.  Keep monitoring the channels and pages since there are plenty of cancellations and incomplete bookings. We also never know when providers will add new appointments.')
  }
  return Response('Looks like a developer made a mistake programming me, and I don\'t know what to reply with!')
}

module.exports = faqs
