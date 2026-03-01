import { Link } from "react-router-dom"

export default function Skip() {
    return (
        <div>
            <h1>Skip Page</h1>
            <Link to="/dashboard">Go to Dashboard</Link>
        </div>
    )
}