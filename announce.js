
const Axios = require('axios')
const SlackInboundSecret = require('./src/slackInboundSecret')

const { ANNOUNCEMENT_CHANNEL:channel, BOT_USER_ID } = process.env

const SLACK_API = 'https://slack.com/api/chat.postMessage'


const thyself = async () => {
  const authToken = await SlackInboundSecret()
  const config = {
    headers: {
      Authorization: `Bearer ${authToken}`
    }
  }
  const announcement = {
    channel,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Hey there, I'm <@${BOT_USER_ID}>! You can message me with <@${BOT_USER_ID}> in your Direct Messages.`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `If you message me and ask something like "Can you find me a vaccine?", I will ask you where and how far. Then, I'll look for vaccines inside that area 24/7 just for you, and send you a push notification on Slack!`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `I search HEB, Walmart, Walgreens, Riteaid, CVS, and several more national providers. I do not currently have a way to find a specific vaccine type, and I look for any of the J&J, Moderna, and Pfizer vaccines, so keep that in mind.`
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
          text: `:heart::syringe::heart: <@${BOT_USER_ID}>`
        }
      }
    ]
  }
  await Axios.post(SLACK_API, announcement, config)
}

module.exports = {
  thyself
}


if (!module.parent) {
  thyself()
}
