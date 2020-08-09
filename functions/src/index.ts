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
const usersCollection = 'user';
const groupCollection = 'group';

interface User {
    firstName: string,
    lastName: string,
    photoUrl: string,
    email: string
}

interface Group {
    name: string,
    amount: number,
    readonly creationDate: number;
}

// Register an account
app.post('/register', async (req, res) => {
    try { 
        const {firstName, lastName, email, photoUrl} = req.body;
        
        const user = await db.collection(usersCollection).doc(email).get()
    
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
        await db.collection(usersCollection).doc(email).set(newUser);
        
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

// Login user
app.post('/login', async (req, res, next) => {
    try { 
        const {firstName, lastName, email, photoUrl} = req.body;
        
        const userRef = db.collection(usersCollection).doc(email);
        const user = await userRef.get()

        if (user.exists) {
            // update the user data
            const newUser: User = {
                firstName: firstName,
                lastName: lastName,
                email: email,
                photoUrl: photoUrl
            }

            await userRef.update(newUser);

            res.status(200).send({
                status: true,
                message: "User logged In successfully !!!"
            }); 
        } else {
            res.status(400).send({
                status: false,
                message: "User unavailable check your mail and try again"
            }); 
        }
        
    } catch (error) {
        res.status(400).send({
            status: false,
            message: "Unable to login check your credentials and try again"
        })
    }
});


// Create a Split group
app.post('/users/group', async (req, res, next) => {
    try {
        //create group name, amount, creationDate
        const {name, amount, email} = req.body;
        const newGroup: Group = {
            name: name,
            amount: amount, //amount in the least currency
            creationDate: Date.now()
        }

        const userRef = db.collection(usersCollection).doc(email);
        const groupRef = userRef.collection(groupCollection).doc(newGroup.name);    
        await groupRef.set(newGroup);
    
        res.status(201).send({
            status: true,
            message: "Group created successfully !!!"
        });

    } catch (error) {
        res.status(400).send({
            staus: false,
            message: "Unable to create group"
        })
    }
});

//define google cloud function name
export const test = functions.https.onRequest(main);