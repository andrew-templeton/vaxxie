
const Axios = require('axios')
const SlackInboundSecret = require('./src/slackInboundSecret')

const { ANNOUNCEMENT_CHANNEL:channel, BOT_USER_ID_EN, BOT_USER_ID_ES } = process.env

const LANGS = ['en', 'es']

const SLACK_API = 'https://slack.com/api/chat.postMessage'


const thyself = async () => {
  const authTokens = await SlackInboundSecret()
  const announceEn = async () => {
    const config = {
      headers: {
        Authorization: `Bearer ${authTokens.en}`
      }
    }
    const announcement = {
      channel,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Hey there, I'm <@${BOT_USER_ID_EN}>! You can message me with <@${BOT_USER_ID_EN}> in your Direct Messages.`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `If you message me and ask something like "Can you find me a vaccine?", I will ask you where and how far. Then, I'll look for vaccines inside that area 24/7 just for you, and send you a push notification on Slack if I am able to find any indicated availability from providers!`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `I search HEB, Walmart, Walgreens, Riteaid, CVS, and several more national providers. I do not currently have a way to find a specific vaccine type, and I look for any of the J&J, Moderna, and Pfizer vaccines, so keep that in mind. Trademarks property of their respective owners, not affiliated with any seller or manufacturer of vaccines.`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `You can't talk to me in the channels like #general. I will only reply in direct messages, so make sure you message me there. I show up just like a person would.`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `I am run by one of the developers here, with the approval of the owner of this Slack. Remember, there are many, many users in our Slack now, so while I know you might have questions, do your best to self-help using my Frequently Asked Questions and visual/textual help guide, <https://github.com/andrew-templeton/vaxxie/blob/master/README.md|which you can find here!>`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `For those of you worried about privacy (as you all should be), I only collect the zipcode, your search radius, the latitude and longitude of the zipcode's post office, and your anonymous Slack ID (which does NOT have your name, and just looks like this: \`UABCD1234\`). I need this information to find the right vaccines, and I need your Slack ID so I can send the push message to the right place.`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `You can set up multiple searches using me, ask me to "list my searches" if you want to see where I'm looking for you, and *I work nationally*, on any zipcode in the country, not just Texas!`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `So help your family, help your friends, help your neighbors, and let's get some shots in arms!`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Much love,`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `:heart::syringe::heart: <@${BOT_USER_ID_EN}>`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `(legal stuff I have to put since one could technically misuse the bot :anguished:)
  <https://github.com/andrew-templeton/vaxxie/blob/master/README.md#no-warranty-for-any-purpose|NO WARRANTY FOR ANY PURPOSE>, <https://github.com/andrew-templeton/vaxxie#you-are-solely-responsible-for-verifying-eligibility-of-the-people-you-use-to-book-this-for|YOU ARE SOLELY RESPOSIBLE FOR VERIFYING ELIGIBILITY OF THE PEOPLE YOU USE TO BOOK THIS FOR>, <https://github.com/andrew-templeton/vaxxie#no-representations-of-medical-advice-legal-advice-or-statements-of-fact|NO REPRESENTATIONS OF MEDICAL ADVICE, LEGAL ADVICE, OR STATEMENTS OF FACT>, <https://github.com/andrew-templeton/vaxxie#not-fit-for-use-by-minors-or-dependents|NOT FIT FOR USE BY MINORS OR DEPENDENTS>, <https://github.com/andrew-templeton/vaxxie#fair-use|FAIR USE>, <https://github.com/andrew-templeton/vaxxie#may-shut-down-at-the-sole-discretion-of-operators|MAY SHUT DOWN AT THE SOLE DISCRETION OF OPERATORS>`
          }
        }
      ]
    }
    await Axios.post(SLACK_API, announcement, config)
    await Axios.post(SLACK_API, {
      channel,
      blocks: [
        {
          type: 'image',
          image_url: 'https://s3.amazonaws.com/07bad1ce-5fe6-449f-9e1c-52cd6d38ee6f/vaxxie.gif',
          alt_text: 'animated image of the Vaxxie bot being used in direct messages in Slack'
        }
      ]
    }, config)
  }
  const announceEs = async () => {
    const config = {
      headers: {
        Authorization: `Bearer ${authTokens.es}`
      }
    }
    const announcement = {
      channel,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `¡Hola, soy <@${BOT_USER_ID_ES}>! Puedes enviarme un mensaje con <@${BOT_USER_ID_ES}> en tus mensajes directos.`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Si me envía un mensaje y pregunta algo como "¿Puede encontrarme una vacuna?", Le preguntaré dónde y qué tan lejos. Luego, buscaré vacunas dentro de esa área las 24 horas del día, los 7 días de la semana, solo para usted, y le enviaré una notificación automática en Slack si puedo encontrar alguna disponibilidad indicada de los proveedores.`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Busco HEB, Walmart, Walgreens, Riteaid, CVS y varios proveedores nacionales más. Actualmente no tengo una forma de encontrar un tipo de vacuna específico, y busco cualquiera de las vacunas J&J, Moderna y Pfizer, así que téngalo en cuenta. Marcas registradas propiedad de sus respectivos dueños, no afiliadas a ningún vendedor o fabricante de vacunas.`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `No puedes hablarme en los canales como #general. Solo responderé en mensajes directos, así que asegúrese de enviarme un mensaje allí. Me presento como lo haría una persona.`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Estoy dirigido por uno de los desarrolladores aquí, con la aprobación del propietario de este Slack. Recuerde, hay muchos, muchos usuarios en nuestro Slack ahora, así que aunque sé que puede tener preguntas, haga todo lo posible por autoayuda utilizando mi guía de preguntas frecuentes y ayuda visual / textual, <https://github.com/andrew-templeton/vaxxie/blob/master/README-ES.md|¡que puede encontrar aquí!>`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Para aquellos de ustedes preocupados por la privacidad (como todos deberían estar), solo recopilo el código postal, su radio de búsqueda, la latitud y longitud de la oficina postal del código postal y su ID anónimo de Slack (que NO tiene su nombre, y solo tiene este aspecto: \`UABCD1234\`). Necesito esta información para encontrar las vacunas adecuadas, y necesito su ID de Slack para poder enviar el mensaje push al lugar correcto.`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Puedes configurar varias búsquedas con mí, pedirme que "enumere mis búsquedas" si quieres ver dónde te estoy buscando y *yo trabajo a nivel nacional*, en cualquier código postal del país, no solo en Texas.`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `¡Así que ayude a su familia, ayude a sus amigos, ayude a sus vecinos y pongámonos en marcha!`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Mucho amor,`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `:heart::syringe::heart: <@${BOT_USER_ID_ES}>`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `(cosas legales que tengo que poner, ya que técnicamente se podría hacer un mal uso del bot :anguished:)
<https://github.com/andrew-templeton/vaxxie/blob/master/README-ES.md#sin-garantía-para-ningún-propósito|NO HAY GARANTÍA PARA NINGÚN PROPÓSITO>, <https://github.com /andrew-templeton/vaxxie/blob/master/README-ES.md#usted-es-el-único-responsable-de-verificar-la-elegibilidad-de-las-personas-que-utiliza-para-reservar-esto|TIENES LOS ÚNICOS RESPONSABLES DE VERIFICAR LA ELEGIBILIDAD DE LAS PERSONAS QUE USTED UTILIZA PARA RESERVAR ESTO>, <https://github.com/andrew-templeton/vaxxie/blob/master/README-ES.md#no-hay-declaraciones-de-asesoramiento-médico-asesoramiento-legal-o-declaraciones-de-hecho | NO HAY DECLARACIONES DE ASESORAMIENTO MÉDICO, ASESORAMIENTO LEGAL O DECLARACIONES DE HECHO>, <https://github.com/andrew-templeton/vaxxie/blob/master/README-ES.md#no-apto-para-menores-o-dependientes | NO ADECUADO PARA MENORES O DEPENDIENTES>, <https://github.com/andrew-templeton/vaxxie/blob/master/README-ES.md#uso-justo | USO JUSTO>, <https://github.com/andrew-templeton/vaxxie/blob/master/README-ES.md#puede-apagarse-a-discreción-exclusiva-de-los-operadores | PUEDE APAGARSE A LA ÚNICA DISCRECIÓN DE OPE RATORS>`
          }
        }
      ]
    }
    await Axios.post(SLACK_API, announcement, config)
    await Axios.post(SLACK_API, {
      channel,
      blocks: [
        {
          type: 'image',
          image_url: 'https://s3.amazonaws.com/07bad1ce-5fe6-449f-9e1c-52cd6d38ee6f/vaxxie.gif',
          alt_text: 'imagen animada de Vaxxie, usado en mensajes directos en Slack'
        }
      ]
    }, config)
  }

  await announceEn()
  await announceEs()
}

module.exports = {
  thyself
}


if (!module.parent) {
  thyself()
}
