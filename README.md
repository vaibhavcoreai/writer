# Writer
![Writer App Icon](./assets/icon.png)

<p align="center">
  <em>A sanctuary for your thoughts. Distraction-free writing for the modern storyteller.</em>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#firebase-setup">Firebase Setup</a> •
  <a href="#deployment">Deployment</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## 📖 About

**Writer** is a minimalist writing platform designed to bring the focus back to storytelling. Whether you're crafting a poem, a blog post, or a novel, Writer provides an elegant, distraction-free environment where your creativity can flourish. Built with modern web technologies, it offers a seamless experience for both creators and readers.

🌐 **Live Demo**: [forwriters.vercel.app](https://forwriters.vercel.app)

---

## ✨ Features

### For Writers
- **Distraction-Free Editor**: A clean, minimal interface powered by TipTap rich text editor
- **Focus Mode**: One-click immersive writing experience that fades surrounding elements
- **Multiple Content Types**: Create stories, poems, blogs, or quick drafts
- **Auto-Save**: Never lose your work with automatic draft saving
- **Chapter Management**: Organize longer works with multi-chapter support
- **Selective Chapter Reading**: Readers can navigate specific chapters with a clean "Table of Contents" interface
- **Reading Progress Tracking**: (For members) Automatically resumes your story from the last chapter you read
- **Smart Publishing**: Publish to a public library with one click
- **Draft Management**: Keep works-in-progress private until ready
- **Public Profiles**: Shareable author profiles with all published works

### For Readers
- **Public Library**: Browse all published stories without requiring an account
- **Advanced Filtering**: Filter by content type (Story, Poem, Blog)
- **Smart Search**: Find stories by title or author
- **Reader Engagement**: Like and appreciate your favorite stories
- **Author Discovery**: Click any author name to explore their full catalog
- **Responsive Design**: Beautiful reading experience on any device

### Technical Highlights
- **Email/Password Authentication**: Secure sign-up/login for writers
- **Real-time Database**: Cloud Firestore for instant data sync and progress saving
- **Security-First**: Granular Firestore rules ensure content ownership
- **SEO Optimized**: Semantic HTML and meta tags for discoverability
- **Progressive Enhancement**: Works for guests, enhanced for authenticated users
- **Client-Side Sorting**: No Firestore composite indexes required
- **Smooth Animations**: Carefully crafted micro-interactions and page transitions

---

## 🛠️ Tech Stack

### Frontend
- **React 19** - Modern UI library with latest features
- **React Router DOM 7** - Client-side routing with dynamic parameters
- **TipTap** - Headless rich-text editor based on ProseMirror
- **Tailwind CSS 4** - Utility-first CSS framework (custom design system)
- **Vite 7** - Next-generation frontend tooling

### Backend & Services
- **Firebase Authentication** - Google OAuth & Email/Password
- **Cloud Firestore** - NoSQL document database
- **Firebase Hosting** - Static hosting with CDN

### Development Tools
- **ESLint** - Code linting and quality checks
- **PostCSS** - CSS processing and optimization
- **Vercel** - Deployment and preview environments

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18.x or higher
- **npm** or **yarn**
- **Firebase Account** (free tier works perfectly)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/vaibhavcoreai/writer.git
   cd writer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview  # Preview the production build locally
```

---

## 🔥 Firebase Setup

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the setup wizard
3. Enable **Google Analytics** (optional but recommended)

### 2. Enable Authentication

1. In the Firebase Console, navigate to **Authentication** → **Sign-in method**
2. Enable **Email/Password** provider
3. Note: **Google Sign-In** is currently not implemented in the application code.

### 3. Create Firestore Database

1. Navigate to **Firestore Database** → **Create database**
2. Choose **Production mode** (we'll add custom rules)
3. Select a region close to your users

### 4. Set Firestore Security Rules

In the Firebase Console, go to **Firestore Database** → **Rules** and replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // User profiles: Anyone can read, only owner can write
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Reading Progress: Only the reader can see and update their own progress
    match /reading_progress/{progressId} {
      allow read, write: if request.auth != null && (
        (request.resource != null && request.auth.uid == request.resource.data.userId) ||
        (resource != null && request.auth.uid == resource.data.userId)
      );
    }
    
    // Stories: Public can read published, authors can manage their own
    match /stories/{storyId} {
      allow read: if resource.data.status == 'published' || 
                  (request.auth != null && request.auth.uid == resource.data.authorId);
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
                            request.auth.uid == resource.data.authorId;
    }

    // Saves: Authenticated users can manage their own saves
    match /saves/{saveId} {
      allow read, write: if request.auth != null && (
        (request.resource != null && request.auth.uid == request.resource.data.userId) ||
        (resource != null && request.auth.uid == resource.data.userId)
      );
    }
  }
}
```

### 5. Get Firebase Configuration

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll to "Your apps" and click the web icon (`</>`)
3. Register your app and copy the configuration
4. Add these values to your `.env` file

---

## 🌐 Deployment

### Deploy to Vercel (Recommended)

1. **Install Vercel CLI** (optional)
   ```bash
   npm install -g vercel
   ```

2. **Deploy via GitHub** (Easy method)
   - Push your code to GitHub
   - Go to [Vercel](https://vercel.com)
   - Click "Import Project"
   - Select your repository
   - Add environment variables from `.env`
   - Click "Deploy"

3. **Deploy via CLI**
   ```bash
   vercel
   ```

The `vercel.json` configuration is already included for proper client-side routing.

### Deploy to Firebase Hosting

1. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase**
   ```bash
   firebase login
   ```

3. **Initialize Firebase**
   ```bash
   firebase init hosting
   ```
   - Select your Firebase project
   - Set public directory to `dist`
   - Configure as single-page app: **Yes**
   - Don't overwrite `index.html`

4. **Build and Deploy**
   ```bash
   npm run build
   firebase deploy
   ```

---

## 🎨 Design Philosophy

Writer follows a minimalist design philosophy inspired by classic typography and paper aesthetics:

- **Color Palette**: Subtle earth tones (Paper, Ink, Sepia)
- **Typography**: Serif fonts for content, Sans-serif for UI elements
- **Animations**: Subtle, purposeful micro-interactions
- **White Space**: Generous spacing for improved readability
- **Focus Mode**: Distraction elimination through progressive disclosure

---

## 📝 Usage

### Writing Your First Story

1. **Sign Up/Login** using Email/Password (*Google Sign-In is not currently available*)
2. Click **"Start Writing"** or navigate to **Write** in the menu
3. Choose a content type (Story, Poem, Blog, or Draft)
4. Start writing in the distraction-free editor
5. Use **Focus Mode** for maximum immersion
6. Click **Save** to store as a draft
7. Click **Publish** when ready to share with the world

### Managing Your Profile

1. Click your avatar → **Profile**
2. Your profile is automatically generated at `/@yourhandle`
3. Share this link to showcase all your published works
4. Stats update automatically (Stories, Poems, Hearts)

### Reading & Discovery

1. Visit the **Library** (no account needed)
2. Browse or search for stories
3. Click any author name to see their profile
4. Give hearts to stories you appreciate

---

## 🤝 Contributing

Contributions are always welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**
   ```bash
   git commit -m 'Add some amazing feature'
   ```
4. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Open a Pull Request**

### Development Guidelines

- Follow existing code style and conventions
- Write meaningful commit messages
- Test your changes thoroughly
- Update documentation if needed

---

## 🐛 Known Issues & Roadmap

### Current Limitations
- No rich media embedding (images, videos) yet
- No collaborative editing
- Limited export options (no PDF/EPUB)

### Planned Features
- [ ] Story collections and series
- [ ] Comment system
- [ ] Writer analytics dashboard
- [ ] Dark theme
- [ ] Custom profile page customization
- [ ] Story export (PDF, Markdown)
- [ ] Reading time estimates
- [ ] Bookmarks and reading lists
- [ ] Email notifications

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 👨‍💻 Author

**Vaibhav Manaji**
- Website: [vaibhavmanaji.vercel.app](https://vaibhavmanaji.vercel.app)
- GitHub: [@vaibhavcoreai](https://github.com/vaibhavcoreai)
- Email: vaibhav.core.ai@gmail.com

---

## 🙏 Acknowledgments

- **TipTap** - For the excellent editor framework
- **Firebase** - For seamless backend infrastructure
- **Tailwind CSS** - For the utility-first approach
- **Vercel** - For deployment and hosting
- All the writers and readers who inspire this project

---

<p align="center">
  Made with ❤️ for storytellers everywhere
</p>

<p align="center">
  <strong>© 2026 Writer Inc.</strong>
</p>
