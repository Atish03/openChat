import "./index.css";
import { Link } from "react-router-dom";

export default function App() {
    return (
        <Link to="/app/user/chat">
            <div className="p-6 bg-white rounded-xl shadow-lg flex items-center space-x-4 transition cursor-pointer hover:shadow-xl">
                <div class="shrink-0">
                    <img class="h-10 w-10 text-slate-600" src="/assets/continue.svg" alt="Continue logo"/>
                </div>
                <div className="text-xl font-medium text-slate-600">Start chatting with friends</div>
            </div>
        </Link>
    )
}