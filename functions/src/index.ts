import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';

//initialize firebase inorder to access its services
admin.initializeApp(functions.config().firebase);

//initialize express server
const app = express();
const main = express();

//add the path to receive request and set json as bodyParser to process the body 
main.use('/api/v1', app);
main.use(express.json());
main.use(express.urlencoded());

//initialize the database and the collection 
const db = admin.firestore();
const userCollection = 'user';

interface User {
    firstName: String,
    lastName: String,
    photoUrl: String,
    email: String
}

// Register an account
app.post('/register', async (req, res) => {
    try { 
        const {firstName, lastName, email, photoUrl} = req.body;
        
        const user = await db.collection(userCollection).doc(email).get()
    
        if(user.exists)      
            res.status(400).send({
                status: false,
                message: "User already exists try to login !!!"
            });
        

        const newUser: User = {
            firstName: firstName,
            lastName: lastName,
            email: email,
            photoUrl: photoUrl
        }
        await db.collection(userCollection).doc(email).set(newUser);
        
        res.status(201).send({
            status: true,
            message: "User registered successfully !!!"
        });
    } catch (error) {
        res.status(400).send({
                status: false,
                message: "Unable to register user",
        })
    }
});


//define google cloud function name
export const test = functions.https.onRequest(main);