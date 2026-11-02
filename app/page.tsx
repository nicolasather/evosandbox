import { redirect } from 'next/navigation';

// The sandbox is the whole site now; the root address opens it.
export default function Home() {
  redirect('/sandbox');
}
