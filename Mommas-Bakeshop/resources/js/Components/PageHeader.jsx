import React from "react";
import { cn } from "@/lib/utils";

export default function PageHeader({ title, subtitle, count, actions, className }) {
	return (
		<div className={cn("px-10 py-10 bg-white border-b relative overflow-hidden group shrink-0", className)}>
            <div className="absolute top-0 right-0 p-10 opacity-[0.03] -rotate-12 group-hover:rotate-0 transition-transform duration-1000">
                <div className="text-9xl font-black italic uppercase tracking-tighter select-none">{title.split(' ')[0]}</div>
            </div>
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">
                            {title}
                        </h1>
                        {count && (
                            <div className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20">
                                {count}
                            </div>
                        )}
                    </div>
                    {subtitle && (
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50 flex items-center gap-2">
                            <span className="h-1 w-8 bg-primary/30 rounded-full" /> {subtitle}
                        </p>
                    )}
                </div>
                {actions && <div className="flex items-center gap-3">{actions}</div>}
            </div>
		</div>
	);
}
