import { Link } from "react-router-dom";

export default function News() {
    return (
        <div>
            <h1>News Page</h1>
            <Link to="/dashboard">Go to Dashboard</Link>
        </div>
    );
}