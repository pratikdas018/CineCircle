# 🎬 CineCircle

**Your Social Movie Discovery Platform**

CineCircle is a modern, full-stack web application that combines movie discovery with social networking. Connect with friends, share movie recommendations, build your watchlist, and never miss a movie night again.

[![React](https://img.shields.io/badge/React-18.x-61dafb?logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Latest-339933?logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?logo=mongodb)](https://www.mongodb.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-Real--time-010101?logo=socket.io)](https://socket.io/)

---

## ✨ Features

### 🎥 Movie Discovery
- **Browse & Search**: Explore thousands of movies with advanced search and filtering
- **Detailed Information**: View comprehensive movie details, cast, crew, and ratings
- **Streaming Providers**: Check where movies are available to watch
- **Trailers**: Watch movie trailers directly in the app
- **Smart Recommendations**: Get personalized movie suggestions

### 👥 Social Features
- **Friend Connections**: Connect with friends and see their movie activities
- **Real-time Chat**: Discuss movies with friends through integrated messaging
- **Reviews & Ratings**: Share your thoughts and read what others think
- **Movie Posts**: Create and share movie-related content with your network

### 📋 Personal Management
- **Watchlist**: Maintain a personalized list of movies to watch
- **Reminders**: Set notifications so you never miss a release date
- **Notifications**: Stay updated on friend activities and recommendations
- **Profile Customization**: Personalize your profile with photos and preferences

### 🎨 User Experience
- **Dark/Light Theme**: Toggle between themes for comfortable viewing
- **Responsive Design**: Seamless experience across desktop, tablet, and mobile
- **Smooth Animations**: Page transitions and interactive elements
- **Real-time Updates**: Live notifications and chat powered by WebSockets

---

## 🚀 Tech Stack

### Frontend
- **React 18** - Modern UI library with hooks
- **React Router** - Client-side routing and navigation
- **Tailwind CSS** - Utility-first CSS framework
- **Socket.io Client** - Real-time bidirectional communication
- **Vite** - Next-generation frontend build tool
- **Context API** - State management for auth, theme, and notifications

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **Socket.io** - Real-time event-based communication
- **JWT** - Secure authentication
- **Bcrypt** - Password hashing
- **Multer** - File upload handling
- **Node-cron** - Scheduled task management
- **Nodemailer** - Email notifications

### APIs & Services
- **TMDB API** - Movie data and information
- **Streaming Availability API** - Real-time streaming provider data

---

## 📁 Project Structure

```
cinecircle/
├── client/                  # Frontend React application
│   ├── src/
│   │   ├── components/      # Reusable React components
│   │   │   ├── chat/        # Chat interface components
│   │   │   ├── common/      # Shared components
│   │   │   ├── layout/      # Layout components (Navbar, Footer)
│   │   │   ├── movie/       # Movie-specific components
│   │   │   └── post/        # Post components
│   │   ├── context/         # React Context providers
│   │   │   ├── AuthContext.jsx
│   │   │   ├── ThemeContext.jsx
│   │   │   ├── SocketContext.jsx
│   │   │   └── NotificationContext.jsx
│   │   ├── pages/           # Page components
│   │   │   ├── Auth/        # Login & Register
│   │   │   ├── Home.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── MovieDetails.jsx
│   │   │   ├── Watchlist.jsx
│   │   │   ├── Friends.jsx
│   │   │   ├── Chat.jsx
│   │   │   └── Notifications.jsx
│   │   ├── services/        # API service layer
│   │   └── utils/           # Utility functions
│   └── public/              # Static assets
│
└── server/                  # Backend Node.js application
    ├── controllers/         # Route controllers
    │   ├── auth.controller.js
    │   ├── movie.controller.js
    │   ├── user.controller.js
    │   ├── chat.controller.js
    │   ├── friend.controller.js
    │   ├── watchlist.controller.js
    │   ├── review.controller.js
    │   ├── notification.controller.js
    │   ├── reminder.controller.js
    │   ├── streaming.controller.js
    │   └── search.controller.js
    ├── models/              # MongoDB models
    │   ├── User.js
    │   ├── Message.js
    │   ├── Review.js
    │   ├── Watchlist.js
    │   ├── Notification.js
    │   └── Reminder.js
    ├── routes/              # API routes
    ├── middleware/          # Custom middleware
    │   ├── authMiddleware.js
    │   └── upload.middleware.js
    ├── config/              # Configuration files
    ├── utils/               # Utility functions
    │   ├── scheduler.js
    │   └── sendEmail.js
    └── uploads/             # User-uploaded files
```

---

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- TMDB API Key ([Get one here](https://www.themoviedb.org/settings/api))
- npm or yarn

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/cinecircle.git
cd cinecircle
```

### 2. Setup Backend

```bash
cd server
npm install
```

Create a `.env` file in the server directory:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
TMDB_API_KEY=your_tmdb_api_key
STREAMING_API_KEY=your_streaming_api_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
CLIENT_URL=http://localhost:5173
```

### 3. Setup Frontend

```bash
cd ../client
npm install
```

Create a `.env` file in the client directory:
```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

### 4. Run the Application

**Start Backend Server:**
```bash
cd server
npm start
# or for development
npm run dev
```

**Start Frontend Development Server:**
```bash
cd client
npm run dev
```

The application will be available at:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5000`

---

## 🎯 Usage

1. **Register/Login**: Create an account or login with existing credentials
2. **Discover Movies**: Browse trending movies or search for specific titles
3. **Build Your Watchlist**: Add movies you want to watch
4. **Connect with Friends**: Send and accept friend requests
5. **Chat & Share**: Discuss movies with friends in real-time
6. **Set Reminders**: Get notified about upcoming movie releases
7. **Write Reviews**: Share your opinions and read others' reviews
8. **Customize Experience**: Toggle dark mode and update your profile

---

## 🔐 API Routes

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Movies
- `GET /api/movies/trending` - Get trending movies
- `GET /api/movies/:id` - Get movie details
- `GET /api/movies/:id/recommendations` - Get similar movies
- `GET /api/movies/:id/trailer` - Get movie trailer

### Watchlist
- `GET /api/watchlist` - Get user's watchlist
- `POST /api/watchlist` - Add movie to watchlist
- `DELETE /api/watchlist/:id` - Remove from watchlist

### Friends
- `GET /api/friends` - Get friend list
- `POST /api/friends/request` - Send friend request
- `PUT /api/friends/accept/:id` - Accept friend request
- `DELETE /api/friends/:id` - Remove friend

### Chat
- `GET /api/chat/conversations` - Get conversations
- `GET /api/chat/messages/:userId` - Get messages with user
- `POST /api/chat/message` - Send message

### Reviews
- `GET /api/reviews/:movieId` - Get movie reviews
- `POST /api/reviews` - Create review
- `PUT /api/reviews/:id` - Update review
- `DELETE /api/reviews/:id` - Delete review

---

## 🌟 Key Features Explained

### Real-time Communication
CineCircle uses Socket.io for instant messaging and live notifications. When you send a message or interact with content, your friends see updates immediately without refreshing.

### Smart Reminders
Set reminders for upcoming movie releases. The backend scheduler checks daily and sends email notifications when your anticipated movies are about to release.

### Personalized Recommendations
Based on your watchlist and viewing history, the app suggests movies you might enjoy using TMDB's recommendation engine.

### Streaming Integration
Check where movies are available to stream across multiple platforms like Netflix, Amazon Prime, Disney+, and more.

---

## 🚢 Deployment

### Frontend (Vercel)
The client includes a `vercel.json` configuration for easy deployment:
```bash
cd client
vercel deploy
```

### Backend (Railway/Render/Heroku)
1. Set environment variables in your hosting platform
2. Deploy the server directory
3. Update `VITE_API_URL` in frontend with production API URL

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 👨‍💻 Author

**Your Name**
- GitHub: [@yourusername](https://github.com/yourusername)
- LinkedIn: [Your LinkedIn](https://linkedin.com/in/yourprofile)

---

## 🙏 Acknowledgments

- [TMDB](https://www.themoviedb.org/) for providing comprehensive movie data
- [React](https://reactjs.org/) team for the amazing framework
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
- All open-source contributors whose libraries made this project possible

---

## 📧 Support

If you have any questions or run into issues, please open an issue on GitHub or contact [your.email@example.com](mailto:your.email@example.com).

---

<div align="center">

**Made with ❤️ and 🎬 by CineCircle Team**

⭐ Star this repository if you found it helpful!

</div>
