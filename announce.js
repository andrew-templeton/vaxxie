
const Axios = require('axios')
const SlackInboundSecret = require('./src/slackInboundSecret')

const { ANNOUNCEMENT_CHANNEL:channel, BOT_USER_ID_EN, BOT_USER_ID_ES, SLACK_DOMAIN } = process.env

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
            text: `<@channel> IMPORTANT: I am sorry to say, but Vaxxie is shutting down. James, the founder of this slack, has been MIA and not responsing to messages for a week now.
            Today, he kicked all of the volunteer organizers out of the slack, including me (the developer of Vaxxie).
            I am saddened to say that I have to recommend to everyone here to delete your account, or just stop sending messages in this account.
            I am posting this via the Vaxxie bot [1] so you all know this is legitimate [2] because he removed my ability to contact people through my Slack account.
            We did not have any argument, and I do not know what is going on. I am concerned that with the founder going "rogue" with no communication that the Slack is not a safe place anymore.
            If you tipped me for this, YOU HAVE BEEN FULLY REFUNDED ALREADY. I am working on solutions to make Vaxxie available in a new environment.`
          }
        }
      ]
    }
    await Axios.post(SLACK_API, announcement, config)
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
            text: `Hola, soy <@${BOT_USER_ID_ES}>.
- Soy un herramienta de búsqueda *nacional*, *gratis* y *personal*. Te ayudo *encontrar vacunas* a lo largo de varios proveedores *en un lugar*.
- *Proveedores:* HEB, Walmart, Walgreens, Riteaid, CVS, y unos más.
- <https://${SLACK_DOMAIN}.slack.com/app_redirect?channel=${BOT_USER_ID_ES}|Haga clic aquí> y dígale a <@${BOT_USER_ID_ES}> "encuéntrame una cita". puedes crear múltiples búsquedas basadas en distancias dentro de tu código postal.
- Trata "me puedes encontrar una vacuna", "mis búsquedas", o "remueve una búsqueda" si querría cancelar una búsqueda. <https://github.com/andrew-templeton/vaxxie/blob/master/README-ES.md|Preguntas comunes>
La pasión de vacunar la gente es lo que motiva a la desarrollador quien hace <@${BOT_USER_ID_ES}>. las cuestas relacionadas con esto herramienta esta cubierto solamente por el creador de <@${BOT_USER_ID_ES}>. Si te ayudó vaxxie, ¡considera a donar al desarrollador para mantener su operaciones! Donaciones son apartes de las donaciones a Texas Vaccine Updates. <https://www.patreon.com/andrewtempleton?fan_landing=true|Haga clic aquí>`
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
  }


  // await announceEs()
  await announceEn()
}

module.exports = {
  thyself
}


if (!module.parent) {
  thyself()
}
