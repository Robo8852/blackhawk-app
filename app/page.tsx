import { Header } from "@/components/header";
import { SearchAdd } from "@/components/search-add";
import { TaskList } from "@/components/task-list";
import { BottomNav } from "@/components/bottom-nav";

export default function Home() {
  return (
    <main className="min-h-screen bg-white pb-32 flex justify-center">
      <div className="w-full max-w-md bg-white min-h-screen relative shadow-2xl">
        <Header />
        <SearchAdd />
        <TaskList />
        <BottomNav />
      </div>
    </main>
  );
}
