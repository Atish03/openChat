// /app -> landing page
// /app/auth/login -> login page
// /app/auth/register -> register page
// /app/user/chat -> chat page

import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from "react-router-dom";
import App from './App';
import Login from './Login';
import Register from './Register';
import Chat from './Chat';
import Keys from './Keys';
import styles from "./styles.module.css";

function Main() {
    return (
        <div className='flex items-center h-screen justify-center bg-transparent boxes'>
            <div className={styles.area} >
                <ul className={styles.circles}>
                    <li></li>
                    <li></li>
                    <li></li>
                    <li></li>
                    <li></li>
                    <li></li>
                    <li></li>
                    <li></li>
                    <li></li>
                    <li></li>
                </ul>
            </div > 
            <BrowserRouter>
                <Routes>
                    <Route element={<App />} path='/'></Route>
                    <Route element={<Login />} path='/app/auth/login'></Route>
                    <Route element={<Register />} path='/app/auth/register'></Route>
                    <Route element={<Chat />} path='/app/user/chat'></Route>
                    <Route element={<Keys />} path='/app/user/generate'></Route>
                </Routes>
            </BrowserRouter>
        </div>
    )
}

const domNode = document.getElementById('root');
const root = createRoot(domNode);
root.render(<Main />);