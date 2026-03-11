import * as React from 'react';
import { createContext, useContext, useEffect, useState, Component, ReactNode } from 'react';
import { Home, Search, Heart, User, Palette, Store, ArrowLeft, Share2, MapPin, Mail, ShoppingBag, ArrowRight, Play, LogOut, Lock, Mail as MailIcon, User as UserIcon, AlertCircle, Loader2 } from 'lucide-react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Trash2, Edit2, Plus, X, ShieldCheck, Settings } from 'lucide-react';

// --- Types ---
export type View = 'home' | 'artist' | 'product' | 'login' | 'register' | 'profile' | 'admin';

interface AppState {
  view: View;
  selectedProductId?: string;
}

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  createdAt: any;
}

// --- Firebase Context ---
interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true, error: null });

export const useAuth = () => useContext(AuthContext);

function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const docRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          }
        } catch (err) {
          console.error("Error fetching profile:", err);
          setError("Failed to load user profile.");
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

// --- Error Boundary ---
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

/*
class AppErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-ceramic-bg text-center">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm">
            <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
            <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-ceramic-taupe mb-6 text-sm">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-ceramic-primary text-white py-3 rounded-2xl font-bold"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
*/

// --- Main App ---
export default function App() {
  return (
    <FirebaseProvider>
      <AppContent />
    </FirebaseProvider>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [state, setState] = useState<AppState>({ view: 'home' });

  useEffect(() => {
    // If user is not logged in and trying to access profile, redirect to login
    if (!loading && !user && state.view === 'profile') {
      setState({ view: 'login' });
    }
  }, [user, loading, state.view]);

  const navigateTo = (view: View, productId?: string) => {
    setState({ view, selectedProductId: productId });
    window.scrollTo(0, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ceramic-bg">
        <Loader2 className="animate-spin text-ceramic-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-md mx-auto bg-ceramic-bg shadow-2xl relative flex flex-col">
      {state.view === 'home' && <HomeView onProductClick={(id) => navigateTo('product', id)} onArtistClick={() => navigateTo('artist')} />}
      {state.view === 'artist' && <ArtistView onBack={() => navigateTo('home')} onProductClick={(id) => navigateTo('product', id)} />}
      {state.view === 'product' && <ProductDetailView onBack={() => navigateTo('home')} onArtistClick={() => navigateTo('artist')} />}
      {state.view === 'login' && <LoginView onNavigate={navigateTo} />}
      {state.view === 'register' && <RegisterView onNavigate={navigateTo} />}
      {state.view === 'profile' && <ProfileView onNavigate={navigateTo} />}
      {state.view === 'admin' && <AdminView onBack={() => navigateTo('profile')} />}
      
      <BottomNav activeView={state.view} onNavigate={navigateTo} />
    </div>
  );
}

function Header({ title, leftAction, rightAction }: { title: string, leftAction?: React.ReactNode, rightAction?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between p-4 bg-ceramic-bg/80 backdrop-blur-md border-b border-ceramic-taupe/10">
      <div className="w-10 flex justify-start">{leftAction}</div>
      <h1 className="font-serif text-xl font-bold italic text-ceramic-primary">{title}</h1>
      <div className="w-10 flex justify-end">{rightAction}</div>
    </header>
  );
}

function HomeView({ onProductClick, onArtistClick }: { onProductClick: (id: string) => void, onArtistClick: () => void }) {
  const categories = [
    { name: 'Vases', img: 'https://images.unsplash.com/photo-1581783898377-1c85bf937427?auto=format&fit=crop&q=80&w=200&h=200' },
    { name: 'Tableware', img: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&q=80&w=200&h=200' },
    { name: 'Decor', img: 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&q=80&w=200&h=200' },
    { name: 'Drinkware', img: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&q=80&w=200&h=200' },
  ];

  const trending = [
    { id: '1', name: 'Terracotta Pitcher', artist: 'Studio Koyo', price: '$64.00', img: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&q=80&w=400&h=500' },
    { id: '2', name: 'Speckled Bowl', artist: 'Mesa Ceramics', price: '$42.00', img: 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&q=80&w=400&h=500' },
    { id: '3', name: 'Basalt Tall Vase', artist: 'Obsidian Clay', price: '$89.00', img: 'https://images.unsplash.com/photo-1581783898377-1c85bf937427?auto=format&fit=crop&q=80&w=400&h=500' },
    { id: '4', name: 'Glazed Coffee Set', artist: 'Minimalist Home', price: '$55.00', img: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&q=80&w=400&h=500' },
  ];

  return (
    <div className="flex-1 pb-24">
      <Header 
        title="Ceramic Market" 
        leftAction={<button className="p-2"><Search size={20} /></button>}
        rightAction={<button className="p-2"><ShoppingBag size={20} /></button>}
      />
      
      <div className="p-4">
        <div className="relative aspect-[16/10] rounded-3xl overflow-hidden group cursor-pointer">
          <img 
            src="https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&q=80&w=800" 
            alt="Featured Collection" 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6">
            <span className="text-ceramic-primary text-xs font-bold uppercase tracking-widest mb-2">Featured Collection</span>
            <h2 className="text-white font-serif text-3xl font-bold mb-4">The Earth Series</h2>
            <button className="bg-ceramic-primary text-white px-6 py-2 rounded-full text-sm font-semibold self-start hover:bg-opacity-90 transition-all">
              Shop Now
            </button>
          </div>
        </div>
      </div>

      <section className="mt-4">
        <div className="flex items-center justify-between px-4 mb-4">
          <h3 className="text-lg font-serif font-bold">Categories</h3>
          <button className="text-ceramic-primary text-xs font-bold uppercase tracking-tighter">View All</button>
        </div>
        <div className="flex gap-4 overflow-x-auto px-4 no-scrollbar">
          {categories.map((cat) => (
            <div key={cat.name} className="flex flex-col items-center gap-2 shrink-0">
              <div className="w-20 h-20 rounded-full overflow-hidden border border-ceramic-taupe/10">
                <img src={cat.img} alt={cat.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              <span className="text-xs font-medium">{cat.name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 px-4">
        <h3 className="text-xl font-serif font-bold mb-6">Trending Now</h3>
        <div className="grid grid-cols-2 gap-x-4 gap-y-8">
          {trending.map((item) => (
            <div key={item.id} className="flex flex-col gap-3 cursor-pointer" onClick={() => onProductClick(item.id)}>
              <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-ceramic-taupe/5">
                <img src={item.img} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <button className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm p-1.5 rounded-full shadow-sm">
                  <Heart size={14} className="text-ceramic-dark" />
                </button>
              </div>
              <div className="flex flex-col gap-1">
                <h4 className="text-sm font-medium leading-tight">{item.name}</h4>
                <p className="text-xs text-ceramic-taupe">{item.artist}</p>
                <p className="text-sm font-bold text-ceramic-primary">{item.price}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ArtistView({ onBack, onProductClick }: { onBack: () => void, onProductClick: (id: string) => void }) {
  const processItems = [
    { id: 'p1', title: 'Hand-mixing local clay', img: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&q=80&w=400&h=500', isVideo: true },
    { id: 'p2', title: 'Centering on the wheel', img: 'https://images.unsplash.com/photo-1493106641515-6b563ad35f1f?auto=format&fit=crop&q=80&w=400&h=400', isVideo: false },
    { id: 'p3', title: 'Mineral pigments', img: 'https://images.unsplash.com/photo-1525909002-1b05e0c869d8?auto=format&fit=crop&q=80&w=400&h=400', isVideo: false },
    { id: 'p4', title: 'The first firing', img: 'https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&q=80&w=400&h=500', isVideo: true },
  ];

  return (
    <div className="flex-1 pb-24">
      <Header 
        title="Process Gallery" 
        leftAction={<button onClick={onBack} className="p-2"><ArrowLeft size={20} /></button>}
        rightAction={<button className="p-2"><Share2 size={20} /></button>}
      />
      
      <div className="flex flex-col items-center p-8">
        <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-ceramic-primary/10 shadow-sm mb-4">
          <img 
            src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200&h=200" 
            alt="Elena Chen" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <h2 className="font-serif text-2xl font-bold">Elena Chen</h2>
        <div className="flex items-center gap-1 mt-1 text-ceramic-taupe">
          <MapPin size={14} className="text-ceramic-primary" />
          <span className="text-sm">Kyoto, Japan</span>
        </div>
      </div>

      <nav className="sticky top-[61px] bg-ceramic-bg/95 backdrop-blur-md z-10 border-b border-ceramic-taupe/10">
        <div className="flex px-4">
          <button className="flex-1 py-4 text-sm font-bold tracking-wide text-ceramic-taupe border-b-2 border-transparent">Portfolio</button>
          <button className="flex-1 py-4 text-sm font-bold tracking-wide text-ceramic-dark border-b-2 border-ceramic-primary">Process</button>
          <button className="flex-1 py-4 text-sm font-bold tracking-wide text-ceramic-taupe border-b-2 border-transparent">Shop</button>
        </div>
      </nav>

      <div className="grid grid-cols-2 gap-x-4 gap-y-8 p-6">
        {processItems.map((item, idx) => (
          <div key={item.id} className={`flex flex-col gap-3 group ${idx % 2 !== 0 ? 'mt-6' : ''}`}>
            <div className={`relative w-full overflow-hidden rounded-2xl bg-ceramic-taupe/10 ${idx % 2 === 0 ? 'aspect-[3/4]' : 'aspect-square'}`}>
              <img 
                src={item.img} 
                alt={item.title} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              {item.isVideo && (
                <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm rounded-full p-1.5">
                  <Play size={12} className="text-white fill-white" />
                </div>
              )}
            </div>
            <p className="font-serif text-sm italic font-medium leading-relaxed">{item.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductDetailView({ onBack, onArtistClick }: { onBack: () => void, onArtistClick: () => void }) {
  return (
    <div className="flex-1 pb-32">
      <Header 
        title="Artisan Piece" 
        leftAction={<button onClick={onBack} className="p-2"><ArrowLeft size={20} /></button>}
        rightAction={<button className="p-2"><Heart size={20} /></button>}
      />
      
      <div className="p-4">
        <div className="aspect-[4/5] w-full rounded-3xl overflow-hidden relative">
          <img 
            src="https://images.unsplash.com/photo-1581783898377-1c85bf937427?auto=format&fit=crop&q=80&w=800" 
            alt="Terracotta Vase" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">
            <div className="h-1 w-8 rounded-full bg-white"></div>
            <div className="h-1 w-2 rounded-full bg-white/40"></div>
            <div className="h-1 w-2 rounded-full bg-white/40"></div>
          </div>
        </div>
      </div>

      <div className="px-6 py-4">
        <h1 className="font-serif text-4xl italic mb-2">Hand-thrown Terracotta Vase</h1>
        <div className="flex items-baseline gap-2 mb-6">
          <span className="text-ceramic-primary text-2xl font-bold">$124.00</span>
          <span className="text-ceramic-taupe text-sm">Includes artisan tax</span>
        </div>

        <p className="text-ceramic-dark/80 text-lg leading-relaxed font-light italic mb-8 border-l-2 border-ceramic-primary/30 pl-4">
          Each piece is meticulously shaped by hand on a traditional kick-wheel, capturing the raw essence of earth and fire in a timeless form. A celebration of imperfection and the human touch.
        </p>

        <div className="space-y-6">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] border-b border-ceramic-primary/10 pb-2">Product Details</h3>
          <div className="grid grid-cols-2 gap-y-4 text-sm">
            <div>
              <p className="text-ceramic-taupe uppercase text-[10px] font-bold tracking-wider mb-1">Material</p>
              <p className="font-medium">Natural Red Terracotta</p>
            </div>
            <div>
              <p className="text-ceramic-taupe uppercase text-[10px] font-bold tracking-wider mb-1">Dimensions</p>
              <p className="font-medium">H: 24cm × W: 18cm</p>
            </div>
            <div className="col-span-2">
              <p className="text-ceramic-taupe uppercase text-[10px] font-bold tracking-wider mb-1">Care Instructions</p>
              <p className="leading-relaxed">Hand wash only with mild soap. Avoid abrasive sponges to preserve the matte finish.</p>
            </div>
          </div>
        </div>

        <div className="mt-12 p-6 rounded-3xl bg-ceramic-primary/5 border border-ceramic-primary/10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-sm cursor-pointer" onClick={onArtistClick}>
              <img 
                src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200&h=200" 
                alt="Elena Chen" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-ceramic-primary mb-1">Meet the Maker</p>
              <h4 className="font-bold text-lg">Elena Chen</h4>
              <button onClick={onArtistClick} className="text-ceramic-primary text-sm font-semibold flex items-center gap-1 hover:underline">
                View Profile <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-ceramic-bg/90 backdrop-blur-lg border-t border-ceramic-taupe/10 max-w-md mx-auto z-50">
        <div className="flex gap-3">
          <button className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white border border-ceramic-taupe/20 text-ceramic-dark shadow-sm">
            <ShoppingBag size={20} />
          </button>
          <button className="flex-1 bg-ceramic-primary text-white font-bold py-4 rounded-2xl shadow-lg shadow-ceramic-primary/20 hover:bg-opacity-90 transition-all flex items-center justify-center gap-2">
            <span>Add to Cart</span>
            <span className="text-xs opacity-70">— $124.00</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function BottomNav({ activeView, onNavigate }: { activeView: View, onNavigate: (view: View) => void }) {
  const { user } = useAuth();
  
  const handleProfileClick = () => {
    if (user) {
      onNavigate('profile');
    } else {
      onNavigate('login');
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-ceramic-bg/90 backdrop-blur-lg border-t border-ceramic-taupe/10 px-6 pb-8 pt-3 max-w-md mx-auto">
      <div className="flex justify-between items-center">
        <button onClick={() => onNavigate('home')} className={`flex flex-col items-center gap-1 ${activeView === 'home' ? 'text-ceramic-primary' : 'text-ceramic-taupe'}`}>
          <Home size={24} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-ceramic-taupe">
          <Search size={24} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Explore</span>
        </button>
        <button onClick={() => onNavigate('artist')} className={`flex flex-col items-center gap-1 ${activeView === 'artist' ? 'text-ceramic-primary' : 'text-ceramic-taupe'}`}>
          <Palette size={24} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Studio</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-ceramic-taupe">
          <Heart size={24} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Saved</span>
        </button>
        <button onClick={handleProfileClick} className={`flex flex-col items-center gap-1 ${activeView === 'profile' || activeView === 'login' || activeView === 'register' ? 'text-ceramic-primary' : 'text-ceramic-taupe'}`}>
          <User size={24} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Profile</span>
        </button>
      </div>
    </nav>
  );
}

// --- Auth Views ---

function LoginView({ onNavigate }: { onNavigate: (view: View) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onNavigate('home');
    } catch (err: any) {
      setError(err.message || "Failed to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-8">
      <div className="mb-12 text-center">
        <div className="w-16 h-16 bg-ceramic-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Lock className="text-ceramic-primary" size={32} />
        </div>
        <h2 className="font-serif text-3xl font-bold mb-2">Welcome Back</h2>
        <p className="text-ceramic-taupe">Sign in to your ceramic market account</p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm">
            <AlertCircle size={18} />
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-ceramic-taupe ml-1">Email Address</label>
          <div className="relative">
            <MailIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-ceramic-taupe" size={18} />
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border border-ceramic-taupe/20 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-ceramic-primary/20"
              placeholder="your@email.com"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-ceramic-taupe ml-1">Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-ceramic-taupe" size={18} />
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border border-ceramic-taupe/20 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-ceramic-primary/20"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-ceramic-primary text-white font-bold py-4 rounded-2xl shadow-lg shadow-ceramic-primary/20 hover:bg-opacity-90 transition-all flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : "Sign In"}
        </button>
      </form>

      <div className="mt-auto pt-8 text-center">
        <p className="text-ceramic-taupe text-sm">
          Don't have an account?{' '}
          <button onClick={() => onNavigate('register')} className="text-ceramic-primary font-bold hover:underline">
            Create one
          </button>
        </p>
      </div>
    </div>
  );
}

function RegisterView({ onNavigate }: { onNavigate: (view: View) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create user profile in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: name,
        role: 'user',
        createdAt: serverTimestamp()
      });

      onNavigate('home');
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-8">
      <div className="mb-12 text-center">
        <div className="w-16 h-16 bg-ceramic-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <UserIcon className="text-ceramic-primary" size={32} />
        </div>
        <h2 className="font-serif text-3xl font-bold mb-2">Join Us</h2>
        <p className="text-ceramic-taupe">Start your journey in the ceramic world</p>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        {error && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm">
            <AlertCircle size={18} />
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-ceramic-taupe ml-1">Full Name</label>
          <div className="relative">
            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-ceramic-taupe" size={18} />
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-ceramic-taupe/20 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-ceramic-primary/20"
              placeholder="John Doe"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-ceramic-taupe ml-1">Email Address</label>
          <div className="relative">
            <MailIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-ceramic-taupe" size={18} />
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border border-ceramic-taupe/20 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-ceramic-primary/20"
              placeholder="your@email.com"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-ceramic-taupe ml-1">Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-ceramic-taupe" size={18} />
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border border-ceramic-taupe/20 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-ceramic-primary/20"
              placeholder="Min. 6 characters"
            />
          </div>
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-ceramic-primary text-white font-bold py-4 rounded-2xl shadow-lg shadow-ceramic-primary/20 hover:bg-opacity-90 transition-all flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" size={20} /> : "Create Account"}
        </button>
      </form>

      <div className="mt-auto pt-8 text-center">
        <p className="text-ceramic-taupe text-sm">
          Already have an account?{' '}
          <button onClick={() => onNavigate('login')} className="text-ceramic-primary font-bold hover:underline">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}

// --- Admin View ---

function AdminView({ onBack }: { onBack: () => void }) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    role: 'user' as 'user' | 'admin',
    uid: ''
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const usersData = querySnapshot.docs.map(doc => doc.data() as UserProfile);
      setUsers(usersData);
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenModal = (user?: UserProfile) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        displayName: user.displayName,
        email: user.email,
        role: user.role,
        uid: user.uid
      });
    } else {
      setEditingUser(null);
      setFormData({
        displayName: '',
        email: '',
        role: 'user',
        uid: Math.random().toString(36).substring(2, 15) // Mock UID for manual creation
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await updateDoc(doc(db, 'users', editingUser.uid), {
          displayName: formData.displayName,
          email: formData.email,
          role: formData.role
        });
      } else {
        await setDoc(doc(db, 'users', formData.uid), {
          ...formData,
          createdAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      console.error("Error saving user:", err);
      alert("Error saving user. Check console for details.");
    }
  };

  const handleDelete = async (uid: string) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await deleteDoc(doc(db, 'users', uid));
        fetchUsers();
      } catch (err) {
        console.error("Error deleting user:", err);
      }
    }
  };

  return (
    <div className="flex-1 pb-24 bg-white min-h-screen">
      <Header 
        title="User Management" 
        leftAction={<button onClick={onBack} className="p-2"><ArrowLeft size={20} /></button>}
        rightAction={<button onClick={() => handleOpenModal()} className="p-2 text-ceramic-primary"><Plus size={24} /></button>}
      />

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin text-ceramic-primary" size={32} />
        </div>
      ) : (
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="text-xs font-bold uppercase tracking-widest text-ceramic-taupe">{users.length} Total Users</span>
          </div>
          
          {users.map((user) => (
            <div key={user.uid} className="bg-ceramic-bg/30 border border-ceramic-taupe/10 rounded-3xl p-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                  <UserIcon className="text-ceramic-taupe" size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-ceramic-dark">{user.displayName}</h4>
                  <p className="text-xs text-ceramic-taupe">{user.email}</p>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full mt-1 inline-block ${user.role === 'admin' ? 'bg-ceramic-primary/10 text-ceramic-primary' : 'bg-ceramic-taupe/10 text-ceramic-taupe'}`}>
                    {user.role}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleOpenModal(user)} className="p-2 text-ceramic-taupe hover:text-ceramic-primary transition-colors">
                  <Edit2 size={18} />
                </button>
                <button onClick={() => handleDelete(user.uid)} className="p-2 text-ceramic-taupe hover:text-red-500 transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-t-[40px] p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-10 duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-serif text-2xl font-bold">{editingUser ? 'Edit User' : 'New User'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-ceramic-bg rounded-full">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-ceramic-taupe ml-1">Display Name</label>
                <input 
                  type="text" 
                  required
                  value={formData.displayName}
                  onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                  className="w-full bg-ceramic-bg border border-ceramic-taupe/10 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-ceramic-primary/20"
                  placeholder="Full Name"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-ceramic-taupe ml-1">Email Address</label>
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-ceramic-bg border border-ceramic-taupe/10 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-ceramic-primary/20"
                  placeholder="email@example.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-ceramic-taupe ml-1">Role</label>
                <select 
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value as 'user' | 'admin'})}
                  className="w-full bg-ceramic-bg border border-ceramic-taupe/10 rounded-2xl py-4 px-6 focus:outline-none focus:ring-2 focus:ring-ceramic-primary/20 appearance-none"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <button 
                type="submit"
                className="w-full bg-ceramic-primary text-white font-bold py-4 rounded-2xl shadow-lg shadow-ceramic-primary/20 hover:bg-opacity-90 transition-all"
              >
                {editingUser ? 'Update User' : 'Create User'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileView({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { profile } = useAuth();

  const handleSignOut = async () => {
    await signOut(auth);
    onNavigate('home');
  };

  return (
    <div className="flex-1 pb-24">
      <Header 
        title="My Profile" 
        leftAction={<button onClick={() => onNavigate('home')} className="p-2"><ArrowLeft size={20} /></button>}
        rightAction={<button onClick={handleSignOut} className="p-2 text-red-500"><LogOut size={20} /></button>}
      />

      <div className="p-8 text-center">
        <div className="w-24 h-24 bg-ceramic-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm">
          <UserIcon className="text-ceramic-primary" size={40} />
        </div>
        <h2 className="font-serif text-2xl font-bold">{profile?.displayName || "User"}</h2>
        <p className="text-ceramic-taupe text-sm">{profile?.email}</p>
        
        <div className="mt-4 inline-block px-3 py-1 bg-ceramic-primary/10 text-ceramic-primary rounded-full text-[10px] font-bold uppercase tracking-widest">
          {profile?.role || "Member"}
        </div>
      </div>

      <div className="px-6 space-y-4">
        {profile?.role === 'admin' && (
          <button 
            onClick={() => onNavigate('admin')}
            className="w-full flex items-center justify-between p-5 bg-ceramic-primary text-white rounded-3xl shadow-lg shadow-ceramic-primary/20"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <ShieldCheck size={20} className="text-white" />
              </div>
              <span className="font-bold">Admin Dashboard</span>
            </div>
            <ArrowRight size={18} className="text-white" />
          </button>
        )}

        <button className="w-full flex items-center justify-between p-5 bg-white rounded-3xl border border-ceramic-taupe/10 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-ceramic-bg rounded-xl flex items-center justify-center">
              <ShoppingBag size={20} className="text-ceramic-taupe" />
            </div>
            <span className="font-bold">My Orders</span>
          </div>
          <ArrowRight size={18} className="text-ceramic-taupe" />
        </button>

        <button className="w-full flex items-center justify-between p-5 bg-white rounded-3xl border border-ceramic-taupe/10 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-ceramic-bg rounded-xl flex items-center justify-center">
              <Heart size={20} className="text-ceramic-taupe" />
            </div>
            <span className="font-bold">Wishlist</span>
          </div>
          <ArrowRight size={18} className="text-ceramic-taupe" />
        </button>

        <button className="w-full flex items-center justify-between p-5 bg-white rounded-3xl border border-ceramic-taupe/10 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-ceramic-bg rounded-xl flex items-center justify-center">
              <UserIcon size={20} className="text-ceramic-taupe" />
            </div>
            <span className="font-bold">Account Settings</span>
          </div>
          <ArrowRight size={18} className="text-ceramic-taupe" />
        </button>
      </div>
      
      <div className="p-8">
        <button 
          onClick={handleSignOut}
          className="w-full py-4 rounded-2xl border border-red-100 text-red-500 font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition-all"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
