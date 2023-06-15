import Cookies from 'universal-cookie';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Link } from 'react-router-dom';

const cookies = new Cookies();
let db;

const openReq = indexedDB.open("keyDB", 1);

openReq.onupgradeneeded = (e) => {
    db = e.target.result;
    db.createObjectStore("keyDB_Store", { keyPath: "key" });
};

openReq.onsuccess = (e) => {
    db = e.target.result;
}

openReq.onerror = (e) => {
    console.log("Some error occured");
}

const generateKeys = async () => {
    await toast.promise(fetch("/api/user/genkeys", {
        headers: {
            "Authorization": "Bearer " + cookies.get("session")
        }
    }).then((resp) => {
        return resp.blob()
    }).then((blob) => {
        return blob.text()
    }).then((b64key) => {
        const item = {
            key: "secret-key",
            value: b64key
        }
        const tx = db.transaction("keyDB_Store", "readwrite");
        const store = tx.objectStore("keyDB_Store");
        store.put(item);
    }), {
        pending: "Generating new keys",
        success: "Done!"
    })
}

export default function Keys() {
    return (
        <div className='flex flex-col gap-3'>
            <div onClick={generateKeys} className="text-center bg-white p-3 px-5 text-gray-600 rounded-lg shadow-lg text-lg transition cursor-pointer hover:shadow-xl">Click to generate your key</div>
            <Link to="/app/user/chat"><p className='indent-2 underline text-blue-100'>Continue chatting</p></Link>
            <ToastContainer></ToastContainer>
        </div>   
    )
}