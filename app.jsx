import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BookOpen, Link, Star, MessageSquare, Loader2, User, Send, X, AlertTriangle, Menu, ExternalLink } from 'lucide-react';

// --- Global Firebase Variables (Mandatory Usage) ---
// These variables are automatically provided by the platform and handle configuration and authentication.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-book-hub';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- Firebase Imports and Services ---
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, collection, query, orderBy, onSnapshot, 
  addDoc, serverTimestamp, where 
} from 'firebase/firestore';

// --- Updated Ebook Data with User's 5 Books (INPUT YOUR D2D LINKS HERE) ---
const D2D_RETAILERS_LIST = "Apple Books, Everand, Tolino, Overdrive, Kobo, Barnes & Noble, and more.";

// **IMPORTANT: REPLACE THE PLACEHOLDER URLS BELOW WITH YOUR ACTUAL DRAFT2DIGITAL UNIVERSAL LINKS**
const MOCK_BOOKS = [
  {
    id: 'rising-disgrace',
    title: 'Rising with Disgrace',
    author: 'TURYAHIKAYO EVEREST', // Update your author name
    description: 'A compelling narrative examining resilience and social challenges. Find this title across all major ebook and print-on-demand retailers.',
    links: [
      { name: `Universal D2D Link (Covers ${D2D_RETAILERS_LIST})`, url: 'https://books2read.com/u/bpPM5q' }, // *** REPLACE THIS URL ***
    ],
    coverPlaceholder: 'https://placehold.co/300x450/475569/ffffff?text=Rising+with+Disgrace'
  },
  {
    id: 'truth-justice',
    title: 'Truth Without Justice',
    author: 'TURYAHIKAYO EVEREST',
    description: 'An intense exploration of moral dilemmas and the heavy price of truth in a world that denies it. Available everywhere using the link below.',
    links: [
      { name: `Universal D2D Link (Covers ${D2D_RETAILERS_LIST})`, url: 'https://books2read.com/u/3GQ7YO' }, // *** REPLACE THIS URL ***
    ],
    coverPlaceholder: 'https://placehold.co/300x450/be123c/ffffff?text=Truth+Without+Justice'
  },
  {
    id: 'lost-teenager',
    title: 'The Lost Teenager: Stories of Mothers, Choices and Teenage Struggles',
    author: 'TURYAHIKAYO EVEREST',
    description: 'A collection of poignant stories focusing on the challenges faced by mothers and teenagers navigating difficult life choices.',
    links: [
      { name: `Universal D2D Link (Covers ${D2D_RETAILERS_LIST})`, url: 'https://books2read.com/u/4ADpZJ' }, // *** REPLACE THIS URL ***
    ],
    coverPlaceholder: 'https://placehold.co/300x450/065f46/ffffff?text=The+Lost+Teenager'
  },
  {
    id: 'why-tongue-slips',
    title: 'Why the Tongue Slips: How to Catch It',
    author: 'TURYAHKAYO EVEREST',
    description: 'A practical guide to understanding and controlling verbal missteps, improving communication and social interactions.',
    links: [
      { name: `Universal D2D Link (Covers ${D2D_RETAILERS_LIST})`, url: 'https://books2read.com/u/mqLMd1' }, // *** REPLACE THIS URL ***
    ],
    coverPlaceholder: 'https://placehold.co/300x450/5b21b6/ffffff?text=Why+the+Tongue+Slips'
  },
  {
    id: 'por-que-se-sale-la-lengua',
    title: 'POR QUÉ SE SALE LA LENGUA: Cómo detectarlo',
    author: 'TURYAHIKAYO EVEREST',
    description: 'The Spanish edition of the popular guide on verbal awareness and control. Available now through all your favorite retailers.',
    links: [
      { name: `Universal D2D Link (Covers ${D2D_RETAILERS_LIST})`, url: 'https://books2read.com/u/3RvYXY' }, // *** REPLACE THIS URL ***
    ],
    coverPlaceholder: 'https://placehold.co/300x450/2563eb/ffffff?text=Por+que+Se+Sale'
  },
];

// --- Constants ---
const REVIEW_COLLECTION_PATH = `artifacts/${appId}/public/data/ebook_reviews`;
const MAX_REVIEW_LENGTH = 500;

// Utility function for anonymous user ID generation
const getOrCreateAnonId = () => {
    let id = localStorage.getItem('anonUserId');
    if (!id) {
        id = `anon-${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem('anonUserId', id);
    }
    return id;
};

// --- Review Submission Component ---
const ReviewForm = ({ bookId, db, userId, userName }) => {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const handleRating = (newRating) => setRating(newRating);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!db || !userId) { setError('Authentication not ready. Please wait.'); return; }
    if (rating === 0 || reviewText.length < 10) { setError('Please provide a rating and a review of at least 10 characters.'); return; }
    
    setIsSubmitting(true);
    setError('');

    try {
      await addDoc(collection(db, REVIEW_COLLECTION_PATH), {
        bookId,
        userId,
        userName,
        rating,
        text: reviewText,
        timestamp: serverTimestamp(),
      });
      
      setRating(0);
      setReviewText('');
      
    } catch (err) {
      console.error("Error adding review: ", err);
      setError('Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const characterCount = reviewText.length;

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-white rounded-xl border border-gray-200 shadow-md">
      <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center">
        <Send className="w-5 h-5 mr-2 text-indigo-500"/>
        Write Your Review
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Reviewing as: <span className="font-mono text-xs p-1 bg-indigo-100 rounded text-indigo-800 font-bold">{userName}</span>
      </p>

      {/* Rating Stars */}
      <div className="flex items-center space-x-1 mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            onClick={() => handleRating(star)}
            className={`w-8 h-8 cursor-pointer transition-colors ${
              star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>

      {/* Review Textarea */}
      <textarea
        value={reviewText}
        onChange={(e) => setReviewText(e.target.value.slice(0, MAX_REVIEW_LENGTH))}
        placeholder="Share your thoughts on the book..."
        rows="4"
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 resize-none text-gray-700 transition"
      />
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>Min 10 characters required</span>
        <span>{characterCount}/{MAX_REVIEW_LENGTH} characters</span>
      </div>

      {/* Error Message */}
      {error && (
        <p className="flex items-center text-sm text-red-600 mt-3 p-2 bg-red-50 rounded-lg">
          <AlertTriangle className="w-4 h-4 mr-2" /> {error}
        </p>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting || rating === 0 || characterCount < 10}
        className={`w-full mt-4 py-3 rounded-lg font-bold text-white transition duration-200 shadow-lg flex items-center justify-center ${
          isSubmitting || rating === 0 || characterCount < 10
            ? 'bg-indigo-400 cursor-not-allowed'
            : 'bg-indigo-600 hover:bg-indigo-700 transform hover:-translate-y-0.5'
        }`}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Submitting...
          </>
        ) : (
          <>
            <Send className="w-5 h-5 mr-2" /> Submit Review
          </>
        )}
      </button>
    </form>
  );
};

// --- Review Display Component ---
const ReviewDisplay = React.memo(({ review }) => {
  const date = review.timestamp?.toDate ? review.timestamp.toDate().toLocaleDateString() : 'Loading...';
  
  return (
    <div className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-100 transition duration-150 hover:shadow-md">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <User className="w-5 h-5 text-gray-500 mr-2" />
          <span className="font-semibold text-gray-700 text-sm">{review.userName}</span>
        </div>
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-4 h-4 ${
                star <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
              }`}
            />
          ))}
        </div>
      </div>
      <p className="text-gray-800 text-base mb-2 italic">"{review.text}"</p>
      <p className="text-xs text-gray-400 text-right">Reviewed on {date}</p>
    </div>
  );
});

// --- Book Detail and Review Section Component ---
const BookDetail = ({ book, db, userId, userName }) => {
  const [reviews, setReviews] = useState([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);

  // Real-time Firestore Listener for Reviews
  useEffect(() => {
    if (!db) return;
    
    // Query: Filter by bookId and sort by newest first
    const reviewsQuery = query(
      collection(db, REVIEW_COLLECTION_PATH),
      where("bookId", "==", book.id),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(reviewsQuery, (snapshot) => {
      const fetchedReviews = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setReviews(fetchedReviews);
      setIsLoadingReviews(false);
    }, (error) => {
      console.error("Error fetching reviews: ", error);
      setIsLoadingReviews(false);
    });

    return () => unsubscribe();
  }, [db, book.id]);
  
  const averageRating = useMemo(() => {
      if (reviews.length === 0) return 0;
      const total = reviews.reduce((sum, review) => sum + review.rating, 0);
      return (total / reviews.length).toFixed(1);
  }, [reviews]);


  return (
    <div className="bg-white rounded-3xl shadow-2xl p-6 lg:p-10 mb-12 transition duration-300 hover:shadow-3xl">
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Book Info and Links */}
        <div className="flex-shrink-0 w-full lg:w-1/3 flex flex-col items-center">
          <img
            src={book.coverPlaceholder}
            alt={`${book.title} Cover`}
            className="w-full max-w-xs h-auto rounded-xl shadow-xl mb-6 object-cover aspect-[2/3]"
            onError={(e) => { e.target.onerror = null; e.target.src = 'https://placehold.co/300x450/ccc/333?text=Cover'; }}
          />
          
          <h2 className="text-2xl font-extrabold text-gray-900 text-center mb-1">{book.title}</h2>
          <p className="text-lg text-indigo-600 font-medium mb-4">By {book.author}</p>
          <p className="text-gray-700 text-center mb-6 text-sm">{book.description}</p>
          
          <div className="w-full">
             <h3 className="text-lg font-bold text-gray-800 mb-3 border-b pb-2 flex items-center">
                <Menu className="w-5 h-5 mr-2 text-indigo-500" />
                Available Platforms
             </h3>
             {book.links.map((link, index) => (
               <a
                 key={index}
                 href={link.url}
                 target="_blank"
                 rel="noopener noreferrer"
                 className="flex items-center justify-between w-full p-3 mb-3 bg-green-100 text-green-800 font-semibold rounded-lg shadow-sm hover:bg-green-200 transition duration-150 transform hover:scale-[1.01]"
               >
                 <span>{link.name}</span>
                 <ExternalLink className="w-4 h-4 ml-2" />
               </a>
             ))}
          </div>
        </div>

        {/* Review Section */}
        <div className="w-full lg:w-2/3">
            <h3 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
                <MessageSquare className="w-7 h-7 mr-3 text-indigo-600" />
                Community Reviews
            </h3>
            
            {/* Rating Summary */}
            <div className="bg-indigo-50 p-4 rounded-xl mb-6 flex flex-col sm:flex-row justify-between items-center shadow-inner">
                <div className="mb-2 sm:mb-0">
                    <span className="text-gray-700 font-semibold text-lg">Overall Rating:</span>
                </div>
                <div className="flex items-center text-indigo-800">
                    <span className="text-4xl font-extrabold mr-2">{averageRating}</span>
                    <Star className="w-7 h-7 fill-yellow-500 text-yellow-500" />
                    <span className="ml-4 text-sm text-gray-600">({reviews.length} total reviews)</span>
                </div>
            </div>

            {/* Review Submission Form */}
            <ReviewForm bookId={book.id} db={db} userId={userId} userName={userName} />

            {/* Display Reviews */}
            <h4 className="text-2xl font-bold text-gray-800 mt-10 mb-5 border-b pb-2">Recent Reader Feedback</h4>
            
            {isLoadingReviews && (
                <p className="text-center text-indigo-500 py-6">
                    <Loader2 className="w-6 h-6 mx-auto animate-spin mb-2" />
                    Loading reviews in real-time...
                </p>
            )}

            {!isLoadingReviews && reviews.length === 0 && (
                <p className="text-center text-gray-500 py-6 text-lg">Be the first to leave a review!</p>
            )}

            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {reviews.map((review) => (
                <ReviewDisplay key={review.id} review={review} />
              ))}
            </div>
        </div>
      </div>
    </div>
  );
};


// --- Main Application Component ---
const App = () => {
  const [db, setDb] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [error, setError] = useState(null);

  // 1. Initialize Firebase and Authenticate
  useEffect(() => {
    if (!firebaseConfig) {
      setError("Firebase configuration is missing.");
      return;
    }
    
    try {
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const authService = getAuth(app);
      
      setDb(firestore);

      // Listener for Auth state changes
      const unsubscribe = onAuthStateChanged(authService, (user) => {
        if (user) {
          setUserId(user.uid);
          setUserName(user.isAnonymous ? `User-${user.uid.substring(0, 8)}` : `User-${user.uid.substring(0, 8)}`);
        } else {
          const anonId = getOrCreateAnonId();
          setUserId(anonId);
          setUserName(`Guest-${anonId.substring(0, 7)}`);
        }
        setAuthReady(true);
      });
      
      // Attempt sign-in
      const signIn = async () => {
        if (initialAuthToken) {
          await signInWithCustomToken(authService, initialAuthToken);
        } else {
          await signInAnonymously(authService);
        }
      };

      signIn().catch(err => {
        console.error("Firebase Sign-In Error:", err);
        setError("Failed to sign in. Check console for details.");
      });

      return () => unsubscribe();

    } catch (e) {
      console.error("Firebase Initialization Error:", e);
      setError("Failed to initialize Firebase services.");
    }
  }, []); 

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-6">
        <div className="text-center p-8 bg-white shadow-xl rounded-xl border-t-4 border-red-500">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-800">Application Error</h1>
          <p className="text-gray-600 mt-2">{error}</p>
        </div>
      </div>
    );
  }
  
  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-indigo-600">
          <Loader2 className="w-12 h-12 mx-auto animate-spin" />
          <p className="mt-4 font-semibold text-lg">Initializing Hub and Authenticating...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      
      {/* Header */}
      <header className="bg-indigo-700 shadow-xl py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-extrabold text-white flex items-center">
            <BookOpen className="w-10 h-10 mr-4" />
            The Universal Author Hub
          </h1>
          <p className="text-indigo-200 mt-2 text-xl">Find my books, leave a review, and connect.</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        
        {MOCK_BOOKS.map((book) => (
          <BookDetail 
            key={book.id} 
            book={book} 
            db={db} 
            userId={userId} 
            userName={userName}
          />
        ))}
        
        {/* Author information placeholder */}
        <div className="mt-12 p-8 bg-white rounded-xl shadow-lg border-t-4 border-indigo-400">
            <h2 className="text-2xl font-bold text-indigo-800 mb-3">A Note to My Readers</h2>
            <p className="text-gray-700">
                Thank you for visiting! This hub is designed to make it easy for you to find my books regardless of your preferred retailer. 
                Your reviews are vital for helping other readers find my work, so please take a moment to leave your honest feedback above. Happy reading!
            </p>
        </div>
        
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-400 text-sm">
          &copy; {new Date().getFullYear()} My Author Brand. Built with React and Firebase.
        </div>
      </footer>
      
    </div>
  );
};

export default App;
