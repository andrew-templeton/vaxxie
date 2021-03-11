
const { NAMESPACE } = process.env

const Response = require('./response')

const isSpanishBot = name => !!name.match(/Es$/)

const RESPONSES = {
  en: {
    CancelAppointmentsFAQ: `Usually the email confirmation will contain a link allowing you to reschedule an appointment.
HEB/Walgreens/CVS: See email confirmation to cancel
Walmart: Call the pharmacy`,
    RescheduleAppointmentsFAQ: 'Most providers will not allow you to reschedule your appointment.  You can try calling the provider and seeing if they would be open to it but many times you will need to cancel and make a new appointment.',
    TransferAppointmentsFAQ: 'Most providers will not allow you to transfer appointments to another person. There have been limited exceptions to this, mainly with pharmacies.  Contact the pharmacy to see if it is something they would do.',
    LateApptAppointmentsFAQ: 'Call the pharmacy up to inform them.  Their contact number should be in the email confirmation.  Some sites are more flexible than others, try not to miss your scheduled time!',
    LeftoverAppointmentsFAQ: 'Some providers are keeping waiting lists, but the general feedback is people are showing up for their appointments and there are hardly any leftover vaccines.  It is best if you get a confirmed appointment.',
    SecondAppointmentsFAQ: `Second doses are generally guaranteed from the provider that administered the first dose.  Please contact them if you are due for a second dose and have not received any booking information.
Walgreens and CVS have options for booking second doses as part of their scheduler.`,
    DocumentationAppointmentsFAQ: 'You will need to bring a photo ID and insurance information.  To save time, print, fill and bring in the consent form that is usually included as a link in your confirmation email. Be sure to wear a mask to your appointment!',
    BookingAppointmentsFAQ: 'Generally, you will need the following information to book an appointment: full name, date of birth, email address, phone number. Some forms require additional information like mailing address and insurance.',
    NoFoundAppointmentsFAQ: 'Appointment availability changes constantly.  Keep monitoring the channels and pages since there are plenty of cancellations and incomplete bookings. We also never know when providers will add new appointments.',
    developerMistake: 'Looks like a developer made a mistake programming me, and I don\'t know what to reply with!'
  },
  es: {
    CancelAppointmentsFAQ: `Por lo general, la confirmación por correo electrónico contendrá un enlace que le permitirá reprogramar una cita.
HEB / Walgreens / CVS: Ver confirmación por correo electrónico para cancelar
Walmart: llame a la farmacia`,
    RescheduleAppointmentsFAQ: `La mayoría de los proveedores no le permitirá volver a programar su cita. Puede intentar llamar al proveedor y ver si estarían abiertos a ésta, sino muchas veces que tendrá que cancelar y hacer una nueva cita.`,
    TransferAppointmentsFAQ: `La mayoría de los proveedores no se permitirá transferir las citas a otra persona. Ha habido excepciones limitadas a esta, sobre todo con las farmacias. Póngase en contacto con la farmacia para ver si es algo que harían.`,
    LateApptAppointmentsFAQ: `Llame a la farmacia para informarles. Su número de contacto debe estar en el correo electrónico de confirmación. Algunos sitios son más flexibles que otras, tratan de no perder su tiempo programado!`,
    LeftoverAppointmentsFAQ: `Algunos proveedores mantienen listas de espera, pero la respuesta general es la gente se están presentando a sus citas y casi no hay vacunas sobrantes. Es mejor si se obtiene una cita confirmada.`,
    SecondAppointmentsFAQ: `Dosis segundas son generalmente garantizadas desde el proveedor que administra la primera dosis. Por favor contactar con ellos si tiene previsto para una segunda dosis y no ha recibido ninguna información de reserva.
Walgreens y CVS tienen opciones para reservar la segunda dosis sóla como parte de su agenda.`,
    DocumentationAppointmentsFAQ: `Usted tendrá que llevar una información de identificación con foto y seguros. Para ahorrar tiempo, imprimir, completar y llevar en el formulario de consentimiento que generalmente se incluye como un enlace en su correo electrónico de confirmación. Es mejor que trae ropa de manga corta para habilitar la vacunación. Asegúrese de usar una máscarilla a su cita! ')`,
    BookingAppointmentsFAQ: `En general, necesitará la siguiente información para reservar una cita: nombre completo, fecha de nacimiento, dirección de correo electrónico, número de teléfono. Algunas formas requieren información adicional como dirección postal y de seguros.`,
    NoFoundAppointmentsFAQ: `La disponibilidad de citas cambia constantemente. Mantener el seguimiento de los canales y las páginas que ya hay un montón de cancelaciones y reservas incompletas. También nunca sabemos cuando los proveedores añadirán nuevas citas.`,
    developerMistake: `Se parece que un desarrollador ha cometido un error con mi programación, y yo no sabe con qué debo responder!')`
  }
}

const faqs = async ({ currentIntent: { name, slots={} }, bot: { name:botName } }) => {


  const lang = isSpanishBot(botName) ? 'es' : 'en'
  const responseLibrary = RESPONSES[lang]

  console.log({
    name,
    slots,
    lang,
    botName
  })

  switch (name) {
    case `${NAMESPACE}CancelAppointmentsFAQ`:
      return Response(responseLibrary.CancelAppointmentsFAQ)
    case `${NAMESPACE}RescheduleAppointmentsFAQ`:
      return Response(responseLibrary.RescheduleAppointmentsFAQ)
    case `${NAMESPACE}TransferAppointmentsFAQ`:
      return Response(responseLibrary.TransferAppointmentsFAQ)
    case `${NAMESPACE}LateApptAppointmentsFAQ`:
      return Response(responseLibrary.LateApptAppointmentsFAQ)
    case `${NAMESPACE}LeftoverAppointmentsFAQ`:
      return Response(responseLibrary.LeftoverAppointmentsFAQ)
    case `${NAMESPACE}SecondAppointmentsFAQ`:
      return Response(responseLibrary.SecondAppointmentsFAQ)
    case `${NAMESPACE}DocumentationAppointmentsFAQ`:
      return Response(responseLibrary.DocumentationAppointmentsFAQ)
    case `${NAMESPACE}BookingAppointmentsFAQ`:
      return Response(responseLibrary.BookingAppointmentsFAQ)
    case `${NAMESPACE}NoFoundAppointmentsFAQ`:
      return Response(responseLibrary.NoFoundAppointmentsFAQ)


    case `${NAMESPACE}CancelAppointmentsFAQEs`:
      return Response(responseLibrary.CancelAppointmentsFAQ)
    case `${NAMESPACE}RescheduleAppointmentsFAQEs`:
      return Response(responseLibrary.RescheduleAppointmentsFAQ)
    case `${NAMESPACE}TransferAppointmentsFAQEs`:
      return Response(responseLibrary.TransferAppointmentsFAQ)
    case `${NAMESPACE}LateApptAppointmentsFAQEs`:
      return Response(responseLibrary.LateApptAppointmentsFAQ)
    case `${NAMESPACE}LeftoverAppointmentsFAQEs`:
      return Response(responseLibrary.LeftoverAppointmentsFAQ)
    case `${NAMESPACE}SecondAppointmentsFAQEs`:
      return Response(responseLibrary.SecondAppointmentsFAQ)
    case `${NAMESPACE}DocumentationAppointmentsFAQEs`:
      return Response(responseLibrary.DocumentationAppointmentsFAQ)
    case `${NAMESPACE}BookingAppointmentsFAQEs`:
      return Response(responseLibrary.BookingAppointmentsFAQ)
    case `${NAMESPACE}NoFoundAppointmentsFAQEs`:
      return Response(responseLibrary.NoFoundAppointmentsFAQ)
  }
  return Response(responseLibrary.developerMistake)
}

module.exports = faqs
