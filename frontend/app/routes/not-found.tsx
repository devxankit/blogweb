import { data } from "react-router";

// Catch-all: any unknown URL renders the root 404 boundary with a 404 status.
export async function loader() {
  throw data(null, { status: 404 });
}

export default function CatchAll() {
  return null;
}
