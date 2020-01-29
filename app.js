const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly'];
const TOKEN_PATH = 'token.json';

const CREDENTIALS_PATH = './credentials.json';

let readFile = (fileName) => {
    return new Promise((resolve, reject) => {
        fs.readFile(fileName, (err, content) => {
            if (err) reject(err)
            // Authorize a client with credentials, then call the Google Drive API.
            resolve(content);
          });
    });
}

let writeFile = (path, content) => {
    return new Promise((resolve, reject) => {
        fs.writeFile(path, JSON.stringify(content), (err) => {
            if (err) reject(err);
            resolve();
          });
    });
}

let askQuestion = (question) => {
    return new Promise((resolve, reject) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });
    
          rl.question(question, (code)=> {
              rl.close();
              resolve(code);
          });
    });
}

let getToken = (oAuthClient, code) => {
    return new Promise((resolve, reject) => {
        oAuthClient.getToken(code, (err, token) => {
            if (err) {
                reject(err);
            } else {
                resolve(token);
            }
        });
    });
}

let getAccessToken =  (oAuthClient) => {
    return new Promise(async (resolve, reject) => {
        try {
            const authUrl = oAuthClient.generateAuthUrl({
                access_type: 'offline',
                scope: SCOPES,
              });
        
              console.log('Authorize this app by visiting this url:', authUrl);
        
              let code = await askQuestion('Enter the code from that page here: ');
              let token = await getToken(oAuthClient, code);
              oAuthClient.setCredentials(token);
              await writeFile(TOKEN_PATH, token);
              resolve(oAuthClient);
        } catch (err) {
            reject(err);
        }
    });
}

let getOAuthClient = (credentials) => {
    return new Promise(async (resolve, reject) => {
        const {client_secret, client_id, redirect_uris} = credentials.installed;
        let oAuthClient = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

        let token;
        try {
            token = await readFile(TOKEN_PATH);
            oAuthClient.setCredentials(JSON.parse(token))
            resolve(oAuthClient);
        } catch(err) {
            //TOKEN FILE does not exist. CREATE it.
            oAuthClient = await getAccessToken(oAuthClient);
            console.log('Created token file.');
            resolve(oAuthClient);
        }
    });
}

async function authSetup () {
    let content;
    try {
        content = await readFile(CREDENTIALS_PATH);
        content = JSON.parse(content);
        let oAuthClient = await getOAuthClient(content);
        return oAuthClient;
    } catch (err) {
        console.error(err);
    }
    
}

function listFiles(auth) {
    const drive = google.drive({version: 'v3', auth});
    drive.files.list({
      pageSize: 10,
      fields: 'nextPageToken, files(id, name)',
    }, (err, res) => {
      if (err) return console.log('The API returned an error: ' + err);
      const files = res.data.files;
      if (files.length) {
        console.log('Files:');
        files.map((file) => {
          console.log(`${file.name} (${file.id})`);
        });
      } else {
        console.log('No files found.');
      }
    });
  }

async function main() {
    let authClient = await authSetup();
    listFiles(authClient);
}

main();