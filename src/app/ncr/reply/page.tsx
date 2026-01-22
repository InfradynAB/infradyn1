import { SupplierNCRPortal } from "@/components/ncr/supplier-ncr-portal";

interface PageProps {
    searchParams: Promise<{ token?: string }>;
}

export default async function NCRReplyPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const token = params.token;

    if (!token) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
                <div className="text-center text-white">
                    <h1 className="text-2xl font-bold mb-2">Invalid Link</h1>
                    <p className="text-slate-400">No access token provided.</p>
                </div>
            </div>
        );
    }

    return <SupplierNCRPortal token={token} />;
}

export const metadata = {
    title: "NCR Response Portal | Infradyn",
    description: "Submit your response to the Non-Conformance Report",
};
