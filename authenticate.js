const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

const SCOPE_LIST = {
    //See, edit, create, and delete all of your Google Drive files
    contentCRUD: 'https://www.googleapis.com/auth/drive',
    //View and manage its own configuration data in your Google Drive
    manageAppData: 'https://www.googleapis.com/auth/drive.appdata',
    //View and manage Google Drive files and folders that you have opened or created with this app
    manageAppAccessedFiles: 'https://www.googleapis.com/auth/drive.file',
    //View and manage metadata of files in your Google Drive
    manageMetaData: 'https://www.googleapis.com/auth/drive.metadata',
    //View metadata for files in your Google Drive
    viewMetadata: 'https://www.googleapis.com/auth/drive.metadata.readonly',
    //View the photos, videos and albums in your Google Photos
    viewMedia: 'https://www.googleapis.com/auth/drive.photos.readonly',
    //See and download all your Google Drive files
    downloadContent: 'https://www.googleapis.com/auth/drive.readonly',
    //Modify your Google Apps Script scripts' behavior
    scriptMod: 'https://www.googleapis.com/auth/drive.scripts'
}

const SCOPES = [SCOPE_LIST.viewMetadata, SCOPE_LIST.downloadContent];
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

async function main() {
    console.log('GET LIST OF ALL SCOPES AT: https://developers.google.com/identity/protocols/googlescopes#drivev3');
    let authClient = await authSetup();
    return authClient;
}

module.exports = main();