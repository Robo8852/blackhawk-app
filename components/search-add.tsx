import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";

export function SearchAdd() {
    return (
        <div className="flex w-full gap-3 px-6 py-4 items-center">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                    placeholder="Search"
                    className="pl-10 rounded-full border-gray-400 text-lg h-12"
                />
            </div>
            <Button className="bg-black text-white hover:bg-gray-800 rounded-lg h-12 px-4 text-base font-medium">
                Add Task <Plus className="ml-1 h-5 w-5" />
            </Button>
        </div>
    );
}
