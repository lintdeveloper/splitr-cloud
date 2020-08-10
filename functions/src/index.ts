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
const usersCollection = 'users';
const groupsCollection = 'groups';
const membersCollection = 'members';


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

interface Member {
    email ?: string,
    amount: number,
    readonly creationDate: number,
    firstName ?: string,
    lastName ?: string,
    photoUrl ?: string
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
app.post('/users/:email/groups', async (req, res, next) => {
    try {
        //create group name, amount, creationDate
        const {email} = req.params;  // supposed to be gotten from token
        const {name, amount} = req.body;

        const userRef = db.collection(usersCollection).doc(email);
        const user = await userRef.get()

        if(user.exists){
            const newGroup: Group = {
                name: name,
                amount: amount, //amount in the least currency
                creationDate: Date.now()
            }

            const groupRef = userRef.collection(groupsCollection).doc(newGroup.name.toLowerCase().trim());    
                 await groupRef.set(newGroup);
            
            const userData = await db.collection(usersCollection).get();
            let users: object = {};

            userData.forEach( (doc) => {
                users = doc.data()
            });

            const defaultMember: Member = {
                amount: amount,
                creationDate: Date.now(),
                ...users
            }

            const membersRef = groupRef.collection(membersCollection).doc(email);
            await membersRef.set(defaultMember);

        
            res.status(201).send({
                status: true,
                message: "Group created successfully !!!",
            });
        } else {
            res.status(400).send({
                staus: false,
                message: "User does not exist"
            })
        }

    } catch (error) {
        res.status(400).send({
            staus: false,
            message: "Unable to create group"
        })
    }
});

app.post('/users/:mainUser/groups/:groupName/members', async (req, res, next) => {
    try {
      //add member to a group
      const { groupName, mainUser } = req.params;
      const {memberEmail, amount} = req.body;

      const memberUserRef = db.collection(usersCollection).doc(memberEmail);
      const mainUserRef = db.collection(usersCollection).doc(mainUser)
      const user = await memberUserRef.get()

      const newMember: Member = {
          amount: amount,
          email: memberEmail,
          creationDate: Date.now()
      }

      if (user.exists) {
            const groupRef = mainUserRef.collection(groupsCollection).doc(groupName);
            const group = await groupRef.get();

            if (group.exists) {
                const memberRef = groupRef.collection(membersCollection).doc(memberEmail);
                const member = await memberRef.get();

                if (member.exists) {
                    res.status(400).send({
                        status: false,
                        message: "Member is already available in the group add another member"
                    });  
                } else {
                    // adds a new member to the group
                    const membersRef = groupRef.collection(membersCollection).doc(memberEmail)
                    const _member = await membersRef.set(newMember);

                    res.status(201).send({
                        status: true,
                        message: "Member successfully added",
                        data: _member
                    });  
                }
            } else {
                res.status(400).send({
                    status: false,
                    message: "Group doesn\'t exist"
                });
            }
          // group exists 
      } else {
            res.status(400).send({
                status: false,
                message: "User doesn\'t exist"
            });
      }
    } catch (error) {
        res.status(400).send({
            staus: false,
            message: "Unable to add member"
        })
    }
})



//define google cloud function name
export const test = functions.https.onRequest(main);