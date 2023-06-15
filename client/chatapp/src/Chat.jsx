import { useEffect, useState } from 'react';
import Cookies from 'universal-cookie';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Link, useNavigate } from 'react-router-dom';

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
    const [userSearch, setUserSearch] = useState("");
    const [sender, setSender] = useState("");
    const [online, setOnline] = useState([]);
    const [onlineToShow, setOnlineToShow] = useState([]);
    const [authorized, setAuthorized] = useState(false);
    const [secretKey, setSecretKey] = useState(undefined);
    const [publicKey, setPublicKey] = useState(undefined);
    const navigate = useNavigate();
    let db;

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
            var d = "";
    
            socket.addEventListener("open", () => {
                socket.send(enc.encode(JSON.stringify({ Authorization: cookies.get("session") })));
            });
    
            socket.addEventListener("message", (event) => {
                event.data.text().then((resp) => {
                    d += resp;
                    if (resp.length != 65536) {
                        if (isJSON(d)) {
                            var msg = JSON.parse(d);
                            setCurMsg({ sender: msg.sender, receiver: msg.receiver, body: window.decrypt(msg.body, secretKey) });
                        } else {
                            console.log(d)
                        }
                        d = "";
                    }
                });
            });
        }

        setInterval(loadOnline, 5000);

        initialize();
    }, [secretKey])

    useEffect(() => {
        var openReq = indexedDB.open("keyDB", 1);
        openReq.onerror = () => {
            toast.error("please generate the keys to continue");
        }
        openReq.onsuccess = (e) => {
            db = e.target.result;
            const tx = db.transaction("keyDB_Store", "readwrite");
            const store = tx.objectStore("keyDB_Store");
            const loadedKey = store.get("secret-key");

            loadedKey.onsuccess = (event) => {
                if (event.target.result != undefined) {
                    setSecretKey(event.target.result.value);
                }
            }
            loadedKey.onerror = () => {
                toast.error("database has no key! please generate new one");
            }
        }
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

    useEffect(() => {
        const regex = new RegExp(userSearch);
        setOnlineToShow(online.filter(e => regex.test(e.toLowerCase())));
    }, [userSearch, online])

    const searchReceiver = () => {
        setUserSearch(document.getElementById("receiver").value);
    }

    const sendMessage = () => {
        var msg = MSG_TEMPLATE;
        msg.receiver = receiver;
        msg.body = window.encrypt(document.getElementsByName("typed")[0].value, publicKey);

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

        setCurMsg({receiver: msg.receiver, sender: sender, body: document.getElementsByName("typed")[0].value});
        document.getElementsByName("typed")[0].value = "";
    }

    const selectUser = (e) => {
        setReceiver(e.target.innerHTML);
    }

    useEffect(() => {
        toast.promise(fetch("/api/pubkey/" + receiver).then((resp) => {
            return resp.text();
        }).then((data) => {
            if (isJSON(data)) {
                var msg = JSON.parse(data)
                if (msg.status == "success") {
                    setPublicKey(msg.message);
                } else {
                    throw "internal server error";
                }
            }
        }), {
            pending: "Please wait",
            error: "user has not set the keys"
        })
    }, [receiver])

    const loadOnline = () => {
        fetch("/api/user/getonline", {
            headers: {
                "Authorization": "Bearer " + cookies.get("session")
            }
        }).then((resp) => {
            return resp.json();
        }).then((data) => {
            if (data.users != undefined) {
                setOnline(data.users.sort().filter(e => e != ""));
            }
        })
    }

    const handleSend = (e) => {
        if (e.key == "Enter") {
            sendMessage();
        }
    }

    return (
        <>
        { authorized ?
            (secretKey != undefined) ? <div className='block flex-col justify-center h-full'>
                <div className='p-3 flex justify-center items-center'>
                    <p className='text-center text-4xl bg-white w-fit p-3 rounded-xl text-gray-600 font-bold'>Hi, {sender}</p>
                </div>
                <div className='flex flex-col gap-3 md:flex-row h-fit'>
                    <div id='searcher' className='flex flex-col gap-3 h-fit w-screen p-5 pb-0 md:w-full md:p-0 md:flex md:h-96'>
                        <input id='receiver' onChange={searchReceiver} className='outline-none focus:shadow-lg rounded-lg px-5 py-3 text-gray-700' placeholder="Search users online" />
                        <div className='flex relative h-fit min-h-full w-full bg-white rounded-lg pt-10 p-5 overflow-y-scroll overflow-x-visible'>
                            <img onClick={loadOnline} className='w-8 h-8 absolute bg-white left-1 top-1 rounded-full cursor-pointer' src='/assets/reload-refresh.svg'></img>
                            {
                                online.length == 0 ? <div className='flex flex-col h-full w-full justify-center items-center text-gray-500'><img className='w-27 h-16' src='/assets/doggo.jpg'></img>No one is online</div> : 
                                <div className='flex flex-col gap-2 justify-center w-full h-fit'>
                                    { Object.keys(onlineToShow).map((ind) => <p key={ind} onClick={selectUser} className='text-gray-500 cursor-pointer p-2 w-full transition text-center font-medium text-lg rounded-lg hover:shadow-md border-2'>{onlineToShow[ind]}</p>) }
                                </div>
                            }
                        </div>
                    </div>
                    <div className='flex flex-col gap-3 h-96 w-screen p-5 md:w-full md:p-0'>
                        <p className='text-center bg-white p-2 rounded-lg text-2xl font-bold text-gray-500'>{receiver == "" ? "No user selected" : "Chat with " + receiver}</p>
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
                            <input name='typed' onKeyDownCapture={handleSend} className='outline-none focus:shadow-lg rounded-lg px-5 py-3 text-md text-gray-700 w-full' placeholder='Type something...' autoFocus={true} />
                            <img onClick={sendMessage} className='h-11 shadow-lg w-auto bg-white transition rounded-lg hover:shadow-xl cursor-pointer' src='/assets/send.png' />
                        </div>
                    </div>
                </div>
            </div> : <div className='text-3xl'>Please <Link to="/app/user/generate"><span className='underline text-blue-100'>GENERATE</span></Link> the keys</div>
            :
            <div className='text-3xl'>PLEASE LOGIN</div>
        }
        <ToastContainer></ToastContainer>
        </>
    )
}