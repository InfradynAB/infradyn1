import { DocsLayout } from '@/components/docs/DocsLayout';
import { Phase1 } from '@/components/docs/Phase1';
import { Phase2 } from '@/components/docs/Phase2';
import { Phase3 } from '@/components/docs/Phase3';

export default function DocsPage() {
    return (
        <DocsLayout>
            <div className="space-y-4 mb-16">
                <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
                    Infradyn Platform Journey
                </h1>
                <p className="text-xl text-muted-foreground">
                    A detailed breakdown of our implementation phases, core architecture, and partner ecosystem.
                </p>
            </div>

            <div className="space-y-4">
                <div id="phase-1">
                    <Phase1 />
                </div>
                <div id="phase-2">
                    <Phase2 />
                </div>
                <div id="phase-3">
                    <Phase3 />
                </div>
            </div>

            <footer className="mt-24 pt-12 border-t border-border">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <p className="text-sm text-muted-foreground">
                        &copy; {new Date().getFullYear()} Infradyn Technologies. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6">
                        <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Documentation</a>
                        <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacy Policy</a>
                        <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">Support</a>
                    </div>
                </div>
            </footer>
        </DocsLayout>
    );
}
