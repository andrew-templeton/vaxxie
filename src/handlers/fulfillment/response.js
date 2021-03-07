
module.exports = content => ({
  dialogAction: {
    type: 'Close',
    fulfillmentState: 'Fulfilled',
    message: {
      contentType: 'PlainText',
      content
    }
  }
})
