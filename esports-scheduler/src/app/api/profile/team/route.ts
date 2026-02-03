import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { teamId } = await req.json();
        const userId = (session.user as any).id;

        // Transaction: Remove old team -> Add new team
        // This ensures a user only has ONE main team tag on their profile.
        await prisma.$transaction([
            prisma.teamMember.deleteMany({
                where: { userId: userId }
            }),
            prisma.teamMember.create({
                data: {
                    userId: userId,
                    teamId: teamId,
                    roleInTeam: "Player" // Default role
                }
            })
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Team update error:", error);
        return NextResponse.json({ error: "Failed to update team" }, { status: 500 });
    }
}