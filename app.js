const express = require('express');
const session = require('express-session');

const TWO_HOURS = 1000 * 60 * 60 * 2;
const {
    PORT = 3000,
    NODE_ENV = 'development',
    SESSION_NAME = 'sid',
    SESSION_LIFETIME = TWO_HOURS,
    SESSION_SECRET = '8939hg9oi359y(*&(*%4WJgoaa[3'
} = process.env;

const IN_PROD = NODE_ENV === 'production';

// TODO: Use session store / DB
// In-memory session store - For demo purposes only
const users = [
    { id: 1, name: 'Alex', email: 'alex@gmail.com', password: 'secret' },
    { id: 2, name: 'Max', email: 'max@gmail.com', password: 'secret' },
    { id: 3, name: 'Harry', email: 'harry@gmail.com', password: 'secret' }
];

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    name: SESSION_NAME,
    resave: false,
    saveUninitialized: false,
    secret: SESSION_SECRET,
    cookie: {
        maxAge: SESSION_LIFETIME,
        sameSite: true, // 'strict'
        secure: IN_PROD // Block cookies on HTTP connections if true
    }
}));

app.use((req, res, next) => {
    const { userId } = req.session;
    if (userId) {
        // res.locals - Store request data to be made available to response callbacks
        res.locals.user = users.find(user => user.id === req.session.userId);
    }
    next();
})

// Redirect to login page if not authenticated
const redirectLogin = (req, res, next) => {
    if (!req.session.userId) {
        res.redirect('/login');
    } else {
        next();
    }
}

// Redirect to home page if already authenticated
const redirectHome = (req, res, next) => {
    if (req.session.userId) {
        res.redirect('/home');
    } else {
        next();
    }
}

app.get('/', (req, res) => {
    const { userId } = req.session;

    res.send(`
        <h1>Welcome!</h1>
        ${userId ? `
            <a href="/home">Home</a>
            <form method="post" action="/logout">
                <button>Logout</button>
            </form>    
            ` : `
            <a href="/login">Login</a>
            <a href="/register">Register</a>
        `}
    `);
});

app.get('/home', redirectLogin, (req, res) => {
    const { user } = res.locals;
    console.log(req.session);
    res.send(`
    <h1>Home</h1>
    <a href="/">Main</a>
    <ul>
        <li>Name: ${user.name}</li>
        <li>Email: ${user.email}</li>
    </ul>
    `);
});

app.get('/login', redirectHome, (req, res) => {
    res.send(`
        <h1>Login</h1>
        <form method="post" action="/login">
            <input type="email" name="email" placeholder="Email" required />
            <input type="password" name="password" placeholder="Password" required />
            <input type="submit" value="Login" />
        </form>
        <a href="/register">Register</a>
    `);
});

app.get('/register', redirectHome, (req, res) => {
    res.send(`
        <h1>Register</h1>
        <form method="post" action="/register">
            <input type="text" name="name" placeholder="Name" required />
            <input type="email" name="email" placeholder="Email" required />
            <input type="password" name="password" placeholder="Password" required />
            <input type="submit" value="Register" />
        </form>
        <a href="/login">Login</a>
    `);
});

app.post('/login', redirectHome, (req, res) => {
    const { email, password } = req.body;
    if (email && password) {
        // TODO: Password should be hashed before comparing in prod
        const user = users.find(user => user.email === email && user.password === password);
        if (user) {
            // If user is found, store user ID in a session cookie via the req.session object
            req.session.userId = user.id;
            return res.redirect('/home')
        }
    }

    res.redirect('/login');
});

app.post('/register', redirectHome, (req, res) => {
    const { name, email, password } = req.body;
    if (name && email && password) {
        const exists = users.some(user => user.email === email);

        if (!exists) {
            const user = {
                id: users.length + 1,
                name,
                email,
                password // TODO: Should be hashed in prod
            }

            users.push(user);
            req.session.userId = user.id;
            return res.redirect('/home');
        }
    }

    res.redirect('/register'); // TODO: Add error message
});

app.post('/logout', redirectLogin, (req, res) => {
    req.session.destroy(err => {
        if (err) return res.redirect('/home');

        res.clearCookie(SESSION_NAME);
        res.redirect('/login')
    });
});

app.listen(PORT, () => console.log(`Listening on port ${PORT}...`));