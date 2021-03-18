
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
            text: `:wave::skin-tone-3: I’m <@${BOT_USER_ID_EN}>.
I’m a search tool to help you find vaccines!
<https://${SLACK_DOMAIN}.slack.com/app_redirect?channel=${BOT_USER_ID_EN}|Click here to get started!>
You can talk to me with these phrases:
“Find me an appointment"
“Can you find me a vaccine?”
<https://github.com/andrew-templeton/vaxxie/blob/master/README.md|Learn more about me here.>
If <@${BOT_USER_ID_EN}> helped you, you can tip the developer to keep it going! This is separate than donations made to Texas Vaccine Updates. <https://www.patreon.com/andrewtempleton?fan_landing=true|Click here to contribute>.`
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
