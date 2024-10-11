const http = require('http');
const url = require('url');
const AWS = require('aws-sdk');
require('dotenv').config();
const messages = require('./lang/en/util')

// setting the configuration of aws for the dynamo db database
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
})
const dynamoDB = new AWS.DynamoDB.DocumentClient(); 
const TABLE_NAME = 'dictionary'; 
let requestCount = 0;

// Function to get the total number of entries which means total rows from the table
const totalEntries = function () {
  const params = {
      TableName: TABLE_NAME,
      Select: 'COUNT', // Use 'COUNT' to get the number of items
  };

  return dynamoDB.scan(params).promise()
      .then(data => {
          return data.Count; // Return the count of items
      })
      .catch(error => {
          console.error('Error fetching total entries:', error);
          return 0; // Return 0 or handle error as needed
      });
};


// Utility function to send error responses
function sendErrorResponse(res, statusCode, errorMessage) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: errorMessage }));
}

// Utility function to send success responses
function sendSuccessResponse(res, statusCode, data) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  requestCount++;

  // Handle CORS error
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // General headers for all responses to enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // ========  POST METHOD FOR STORING THE DEFINTION IN THE DICTIONARY =========
  if (req.method === 'POST' && path === '/api/definitions') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      const { word, definition } = JSON.parse(body);

      // Input validation
      if (typeof word !== 'string' || typeof definition !== 'string'|| 
        !/^[A-Za-z]+$/.test(word) || !/^[A-Za-z]+$/.test(definition)) {
        return sendErrorResponse(res, 400, messages.invalidInput);
      }

      // Check if the word already exists
      const getParams = {
        TableName: TABLE_NAME,
        Key: { word }
      };

      dynamoDB.get(getParams, (err, data) => {
        if (err) {
          return sendErrorResponse(res, 500, messages.errorReadingFromDynamoDB);
        }

        if (data.Item) {
          return sendErrorResponse(res, 400, messages.wordAlreadyExists);
        } else {
          // Add word to DynamoDB
          const putParams = {
            TableName: TABLE_NAME,
            Item: { word, definition }
          };

          dynamoDB.put(putParams, (err) => {
            if (err) {
              return sendErrorResponse(res, 500, messages.errorWritingToDynamoDB);
            } else {
              
              totalEntries().then(total => {
                return sendSuccessResponse(res, 200, {
                    message: messages.newEntryRecorded(word, definition, total, requestCount),
                    requestCount
                });
            }).catch(error => {
                return sendErrorResponse(res, 500,  messages.errorRetrievingTotalEntries);
            });
            }
          });
        }
      });
    });

  // ======= GET TO RETRIVE THE DEFINITON OF THE WORD FROM THE DYNAMODB  =========
  } else if (req.method === 'GET' && path === '/api/definitions') {
    const { word } = parsedUrl.query;

    // Input validation
    if (!word || typeof word !== 'string') {
      return sendErrorResponse(res, 400,  messages.invalidInput);
    }

    // Fetch word from DynamoDB
    const getParams = {
      TableName: TABLE_NAME,
      Key: { word }
    };

    dynamoDB.get(getParams, (err, data) => {
      if (err) {
        return sendErrorResponse(res, 500, messages.errorReadingFromDynamoDB);
      } else if (data.Item) {
        return sendSuccessResponse(res, 200, {
          message: messages.wordDefinition(data.Item.word, data.Item.definition, requestCount)
        });
      } else {
        return sendErrorResponse(res, 404, messages.wordNotFound(word, requestCount));
      }
    });
  } else {
    sendErrorResponse(res, 404, messages.notFound);
  }
});

server.listen(3000, () => {
  console.log('Server is listening on port 3000');
});