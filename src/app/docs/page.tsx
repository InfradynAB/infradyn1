import { DocsLayout } from '@/components/docs/DocsLayout';
import { UserRoles } from '@/components/docs/UserRoles';
import { Phase1 } from '@/components/docs/Phase1';
import { Phase2 } from '@/components/docs/Phase2';
import { Phase3 } from '@/components/docs/Phase3';
import { Phase4 } from '@/components/docs/Phase4';
import { Phase5 } from '@/components/docs/Phase5';
import { Phase6 } from '@/components/docs/Phase6';
import { Phase7 } from '@/components/docs/Phase7';
import { Phase8 } from '@/components/docs/Phase8';

export default function DocsPage() {
    return (
        <DocsLayout>
            <div className="space-y-4 mb-20">
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter lg:leading-[1.1]">
                    Infradyn Platform Journey
                </h1>
                <p className="text-2xl text-muted-foreground max-w-[800px] leading-relaxed">
                    A comprehensive technical breakdown of our implementation phases, core architecture, and partner ecosystem.
                </p>
            </div>

            <div className="space-y-8">
                <UserRoles />

                <div id="phase-1">
                    <Phase1 />
                </div>
                <div id="phase-2">
                    <Phase2 />
                </div>
                <div id="phase-3">
                    <Phase3 />
                </div>
                <div id="phase-4">
                    <Phase4 />
                </div>
                <div id="phase-5">
                    <Phase5 />
                </div>
                <div id="phase-6">
                    <Phase6 />
                </div>
                <div id="phase-7">
                    <Phase7 />
                </div>
                <div id="phase-8">
                    <Phase8 />
                </div>
            </div>

            <footer className="mt-32 pt-12 border-t border-border">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                    <p className="text-sm text-muted-foreground font-medium">
                        &copy; {new Date().getFullYear()} Infradyn Technologies. All rights reserved.
                    </p>
                    <div className="flex items-center gap-8">
                        <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">Documentation</a>
                        <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">Privacy Policy</a>
                        <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">Support</a>
                    </div>
                </div>
            </footer>
        </DocsLayout>
    );
}
