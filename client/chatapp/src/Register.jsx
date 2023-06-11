import { Link, useNavigate } from "react-router-dom"
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function Register() {
    const navigate = useNavigate();

    const handleRegister = async() => {
        var user = document.getElementsByName("username")[0].value;
        var pass = document.getElementsByName("password")[0].value;
    
        const req = await toast.promise(fetch("/api/register", {
            method: "POST",
            body: JSON.stringify({ username: user, password: pass }),
            headers: {
                "Content-Type": "application/json"
            }
        }), {
            pending: 'Submitting',
            error: 'Could not send data'
        })
    
        req.json().then((resp) => {
            if (resp.status == "success") {
                toast.success(resp.message);
                navigate("/app/user/chat")
            } else {
                toast.error(resp.error);
            }
        })
    }

    return (
        <div className="flex flex-col gap-3">
            <h1 className="indent-1.5 text-slate-600 font-bold text-3xl rounded-lg bg-slate-100 p-3">Register</h1>
            <div className="flex flex-col gap-5 p-5 bg-slate-100 rounded-lg">
                <div className="flex flex-col justify-right items-right gap-1">
                    <p className="text-slate-600 font-semibold indent-1.5 text-lg">Username</p>
                    <input name="username" className="outline-none px-5 py-3 rounded-lg text-slate-600 font-medium transition focus:shadow-md"></input>
                </div>
                <div className="flex flex-col justify-right items-right gap-1">
                    <p className="text-slate-600 font-semibold indent-1.5 text-lg">Password</p>
                    <input name="password" type="password" className="outline-none px-5 py-3 rounded-lg text-slate-600 font-medium transition focus:shadow-md"></input>
                </div>
                <div className="flex flex-col justify-right items-right gap-1">
                    <p className="text-slate-600 font-semibold indent-1.5 text-lg">Confirm password</p>
                    <input name="confirm-password" type="password" className="outline-none px-5 py-3 rounded-lg text-slate-600 font-medium transition focus:shadow-md"></input>
                </div>
                <button onClick={handleRegister} className="p-3 text-slate-600 font-semibold indent-1.5 text-lg bg-violet-300 rounded-lg transition hover:shadow-lg">Register</button>
                <Link to="/app/auth/login"><p className="indent-1.5 underline text-slate-600">I already have an account</p></Link>
                <ToastContainer></ToastContainer>
            </div>
        </div>
    )
}