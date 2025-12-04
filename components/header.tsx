import Image from "next/image";
export function Header() {
    return (
        <div className="flex flex-col items-center w-full">
            <div className="py-6">
                <img
                    src="/images/logo.png"
                    alt="Blackhawk Transport Logistics"
                    className="h-auto w-72 object-contain"
                />
            </div>
            <div className="w-full bg-black py-3 text-center">
                <h1 className="text-white text-xl font-bold tracking-wider">TO-DO LIST</h1>
            </div>
        </div>
    );
}
