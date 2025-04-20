import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home: React.FC = () => {
  const { user } = useAuth();

  return (
    <>
      {/* Hero Header */}
      <header className="bg-indigo-600 rounded-lg text-white p-8 shadow mb-10">
        <h1 className="text-3xl font-extrabold">PolyDan Iron‑Man Pool</h1>
        <p className="mt-2 text-indigo-100 max-w-2xl">
          Track weekly picks, standings and side‑bets with family and friends. New to the pool? Check the rules below to get started!
        </p>
        <div className="mt-4 space-x-4">
          {user ? (
            <Link
              to="/bets"
              className="inline-flex items-center px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 text-sm font-medium"
            >
              Make / Update Picks
            </Link>
          ) : (
            <Link
              to="/register"
              className="inline-flex items-center px-4 py-2 rounded-md bg-white/10 hover:bg-white/20 text-sm font-medium"
            >
              Join the Pool
            </Link>
          )}
        </div>
      </header>

      {/* Quick‑link Grid */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Leaderboard */}
        <Link to="/leaderboard" className="card">
          <h2 className="card-title">Leaderboard</h2>
          <p className="card-body">See who's leading the pool and by how much.</p>
        </Link>

        {/* Side Bets */}
        <Link to="/side-bets" className="card">
          <h2 className="card-title">Side‑Bets</h2>
          <p className="card-body">Join or create fun wagers outside the main pool.</p>
        </Link>

        {/* Rules */}
        <Link to="/rules" className="card">
          <h2 className="card-title">Pool Rules</h2>
          <p className="card-body">Read the scoring system and weekly deadlines.</p>
        </Link>

        {/* Profile */}
        {user && (
          <Link to="/profile" className="card">
            <h2 className="card-title">Your Profile</h2>
            <p className="card-body">Edit your name, email and avatar.</p>
          </Link>
        )}

        {/* FAQ */}
        <Link to="/faq" className="card">
          <h2 className="card-title">Help & FAQ</h2>
          <p className="card-body">New to Iron‑Man pools? Start here.</p>
        </Link>
      </section>
    </>
  );
};

export default Home;

// Tailwind utility shortcuts via arbitrary classnames
// NOTE: Tailwind doesn't provide `card`, `card-title`, etc. out of the box.
// We rely on the following utility classes added globally (see index.css or a future refactor):
// .card { @apply rounded-lg bg-white shadow p-6 transition hover:shadow-lg; }
// .card-title { @apply text-lg font-semibold text-gray-900 mb-2; }
// .card-body { @apply text-sm text-gray-600; } 