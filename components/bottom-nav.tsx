import { ClipboardList, CheckSquare, Calendar, Settings } from "lucide-react";

export function BottomNav() {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 pb-6 pt-2">
            <div className="flex justify-around items-center max-w-md mx-auto">
                <div className="flex flex-col items-center gap-1">
                    <div className="bg-black p-2 rounded-lg">
                        <ClipboardList className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xs font-medium">Tasks</span>
                </div>

                <div className="flex flex-col items-center gap-1 text-gray-600">
                    <CheckSquare className="h-6 w-6" />
                    <span className="text-xs font-medium">Completed</span>
                </div>

                <div className="flex flex-col items-center gap-1 text-gray-600">
                    <Calendar className="h-6 w-6" />
                    <span className="text-xs font-medium">Calendar</span>
                </div>

                <div className="flex flex-col items-center gap-1 text-gray-600">
                    <Settings className="h-6 w-6" />
                    <span className="text-xs font-medium">Settings</span>
                </div>
            </div>
            {/* Home indicator bar simulation */}
            <div className="w-full flex justify-center mt-4">
                <div className="w-32 h-1 bg-black rounded-full"></div>
            </div>
        </div>
    );
}
