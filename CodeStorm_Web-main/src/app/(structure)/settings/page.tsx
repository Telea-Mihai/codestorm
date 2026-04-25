export default function SettingsPage() {
	return (
		<div className="flex w-full flex-col gap-6 rounded-xl bg-zinc-950 p-6 text-zinc-100">
			<div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
				<h1 className="text-xl font-semibold">Settings</h1>
				<p className="text-sm text-zinc-400">
					Configure your workspace preferences and file behavior.
				</p>
			</div>
		</div>
	);
}
