// messages.js
module.exports = {
    invalidInput: 'Invalid input',
    wordAlreadyExists: 'WARNING! Word already exists',
    errorWritingToDynamoDB: 'Error writing to DynamoDB',
    errorReadingFromDynamoDB: 'Error reading from DynamoDB',
    errorRetrievingTotalEntries: 'Error retrieving total entries',
    notFound: 'Not found',
    wordNotFound: (word, requestCount) => `Request #${requestCount}, word '${word}' not found!`,
    newEntryRecorded: (word, definition, total, requestCount) => 
        `REQUEST #${requestCount}:\nNew entry recorded: "${word} : ${definition}" \nTotal number of entries: "${total}"`,
    wordDefinition: (word, definition, requestCount) => 
        `WORD: ${word}\nDEFINITION: ${definition}\nREQUEST NUMBER: ${requestCount}`
};
