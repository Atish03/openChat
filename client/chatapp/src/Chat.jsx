import { useEffect, useState } from 'react';
import Cookies from 'universal-cookie';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useNavigate } from 'react-router-dom';

var MSG_TEMPLATE = {
    receiver: null,
    body: null
}

function isJSON(str) {
    try {
        return (JSON.parse(str) && !!str);
    } catch (e) {
        return false;
    }
}

export default function Chat() {
    const cookies = new Cookies();
    const [message, setMessage] = useState({});
    const [curMsg, setCurMsg] = useState({});
    const [receiver, setReceiver] = useState("");
    const [sender, setSender] = useState("");
    const [online, setOnline] = useState([]);
    const [authorized, setAuthorized] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const initialize = async () => {
            await fetch("/api/user/verify", {
                headers: {
                    Authorization: "Bearer " + cookies.get("session")
                }
            }).then((resp) => {
                return resp.json();
            }).then((data) => {
                if (data.status == "fail") {
                    toast.error(data.error);
                    setAuthorized(false);
                    navigate("/app/auth/login");

                } else {
                    setAuthorized(true);
                    setSender(data.message);
                }
            })
    
            const socket = new WebSocket("ws://" + window.location.hostname + ":4008");
            var enc = new TextEncoder();
    
            socket.addEventListener("open", () => {
                socket.send(enc.encode(JSON.stringify({ Authorization: cookies.get("session") })));
            });
    
            socket.addEventListener("message", (event) => {
                event.data.text().then((resp) => {
                    if (isJSON(resp)) {
                        var msg = JSON.parse(resp);
                        setCurMsg(msg);
                    } else {
                        console.log(resp);
                    }
                });
            });
        }

        setInterval(loadOnline, 5000);

        initialize();
    }, [])

    useEffect(() => {
        if (curMsg.sender != undefined) {
            var sMsgs = message[curMsg.sender];
            var rMsgs = message[curMsg.receiver];

            if (sMsgs == undefined) {
                sMsgs = [curMsg];
            } else {
                sMsgs = [...message[curMsg.sender], curMsg]
            }

            if (rMsgs == undefined) {
                rMsgs = [curMsg];
            } else {
                rMsgs = [...message[curMsg.receiver], curMsg]
            }

            setMessage({
                ...message,
                [curMsg.sender]: sMsgs,
                [curMsg.receiver]: rMsgs,
            })
        }
    }, [curMsg]);

    const addReceiver = () => {
        setReceiver(document.getElementById("receiver").value);
    }

    const sendMessage = () => {
        var msg = MSG_TEMPLATE;
        msg.receiver = receiver;
        msg.body = document.getElementsByName("typed")[0].value;

        document.getElementsByName("typed")[0].value = "";

        fetch("/api/user/send", {
            method: "POST",
            body: JSON.stringify(msg),
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + cookies.get("session")
            }
        }).then((resp) => {
            return resp.json();
        }).then((data) => {
            if (data.status == "fail") {
                toast.error(data.error);
            }
        })
    }

    const selectUser = (e) => {
        setReceiver(e.target.innerHTML);
    }

    useEffect(() => {
        if (authorized) document.getElementById("receiver").value = receiver;
    }, [receiver]);

    const loadOnline = () => {
        fetch("/api/user/getonline", {
            headers: {
                "Authorization": "Bearer " + cookies.get("session")
            }
        }).then((resp) => {
            return resp.json();
        }).then((data) => {
            setOnline(data.users);
        })
    }

    return (
        <>
        { authorized ?
            <div className='flex flex-col justify-center'>
                <div className='p-3 flex justify-center'>
                    <p className='text-center text-4xl bg-white w-fit p-3 rounded-xl text-gray-600 font-bold'>Hi, {sender}</p>
                </div>
                <div className='flex gap-3 h-96'>
                    <div className='flex flex-col gap-3'>
                        <input id='receiver' onChange={addReceiver} className='outline-none focus:shadow-lg rounded-lg px-5 py-3 text-gray-700' placeholder="Select someone to talk" />
                        <div className='flex relative h-fit min-h-full w-full bg-white rounded-lg p-5'>
                            <img onClick={loadOnline} className='w-8 h-8 absolute bg-white -left-2 -top-2 rounded-full cursor-pointer' src='/assets/reload-refresh.svg'></img>
                            {
                                online.length == 0 ? <div className='flex flex-col h-full w-full justify-center items-center text-gray-500'><img className='w-27 h-16' src='/assets/doggo.jpg'></img>No one is online</div> : 
                                <div className='flex flex-col gap-2 justify-center w-full h-fit'>
                                    { Object.keys(online).map((ind) => <p key={ind} onClick={selectUser} className='text-gray-500 cursor-pointer p-2 w-full transition text-center font-medium text-lg rounded-lg hover:shadow-md border-2'>{online[ind]}</p>) }
                                </div>
                            }
                        </div>
                    </div>
                    <div className='flex flex-col gap-3'>
                        <div className='flex flex-col rounded-lg w-full h-fit min-h-full p-5 text-gray-600 bg-white gap-2 overflow-scroll overflow-x-hidden'>
                            {
                                message[receiver] != undefined ?
                                Object.keys(message[receiver]).map((ind) =>
                                    <div key={ind} className={message[receiver][ind].sender != receiver ? 'w-full flex justify-end' : 'w-full p-1 flex justify-start'}>
                                        <p className={message[receiver][ind].sender != receiver ? 'w-fit right-0 border-2 border-slate-300 p-1 px-2 rounded-xl rounded-br-none' : 'w-fit right-0 border-2 border-slate-300 p-1 px-2 rounded-xl rounded-bl-none'} style={{ "maxWidth": "250px" }}>{message[receiver][ind].body}</p>
                                    </div>
                                ) :
                                <></>
                            }
                        </div>
                        <div className='flex gap-3 items-center'>
                            <input name='typed' className='outline-none focus:shadow-lg rounded-lg px-5 py-3 text-md text-gray-700 w-full' placeholder='Type something...' />
                            <img onClick={sendMessage} className='h-11 shadow-lg w-auto bg-white transition rounded-lg hover:shadow-xl cursor-pointer' src='/assets/send.png' />
                        </div>
                    </div>
                </div>
            </div>
            :
            <div className='text-3xl'>PLEASE LOGIN</div>
        }
        <ToastContainer></ToastContainer>
        </>
    )
}