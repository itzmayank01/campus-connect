import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const period = request.nextUrl.searchParams.get("period") || "week"
    const dbUser = await prisma.user.findUnique({ where: { supabaseId: user.id } })
    const currentUserId = dbUser?.id

    let dateFilterQuery = ""
    if (period === "week") {
      dateFilterQuery = ">= DATE_TRUNC('week', NOW())"
    } else if (period === "month") {
      dateFilterQuery = ">= DATE_TRUNC('month', NOW())"
    } // "all" has no date filter

    // Execute the massive combined raw query matching the user's exact specifications
    const query = `
      WITH leaderboard_cte AS (
        SELECT 
          u.id as user_id,
          u.name as full_name,
          u.email,
          u.image as avatar_url,
          
          COALESCE(us.flame_score, 0)::int as flame_score,
          COALESCE(us.flame_level, 'Starter Flame') as flame_level,
          COALESCE(us.current_streak, 0)::int as current_streak,
          COALESCE(us.longest_streak, 0)::int as longest_streak,
          
          COALESCE(upload_stats.upload_count, 0)::int as upload_count,
          COALESCE(download_stats.downloads_received, 0)::int as downloads_received,
          COALESCE(like_stats.likes_received, 0)::int as likes_received,
          
          ${period === "all" 
            ? "COALESCE(us.flame_score, 0)::int" 
            : `(
                COALESCE(upload_stats.uploads_this_period, 0) * 5 +
                COALESCE(download_stats.downloads_this_period, 0) * 1 +
                COALESCE(like_stats.likes_this_period, 0) * 3 +
                COALESCE(us.current_streak, 0) * 1
              )::int`
          } as points_this_period,
          
          RANK() OVER (
            ORDER BY (
              ${period === "all" 
                ? "COALESCE(us.flame_score, 0)" 
                : `(
                    COALESCE(upload_stats.uploads_this_period, 0)*5 +
                    COALESCE(download_stats.downloads_this_period, 0)*1 +
                    COALESCE(like_stats.likes_this_period, 0)*3 +
                    COALESCE(us.current_streak, 0)*1
                  )`
              }
            ) DESC,
            u.created_at ASC
          )::int as rank
          
        FROM users u
        
        LEFT JOIN user_streaks us 
          ON u.id = us.user_id
        
        LEFT JOIN (
          SELECT 
            uploader_id,
            COUNT(*) as upload_count,
            COUNT(*) FILTER (
              WHERE deleted_at IS NULL
              ${dateFilterQuery ? `AND created_at ${dateFilterQuery}` : ""}
            ) as uploads_this_period
          FROM resources
          WHERE is_public = true AND deleted_at IS NULL
          GROUP BY uploader_id
        ) upload_stats ON u.id = upload_stats.uploader_id
        
        LEFT JOIN (
          SELECT 
            r.uploader_id,
            COUNT(rd.id) as downloads_received,
            COUNT(rd.id) FILTER (
              WHERE 1=1
              ${dateFilterQuery ? `AND rd.downloaded_at ${dateFilterQuery}` : ""}
            ) as downloads_this_period
          FROM resource_downloads rd
          JOIN resources r ON rd.resource_id = r.id
          WHERE r.is_public = true AND r.deleted_at IS NULL
          GROUP BY r.uploader_id
        ) download_stats ON u.id = download_stats.uploader_id
        
        LEFT JOIN (
          SELECT 
            r.uploader_id,
            COUNT(rl.id) as likes_received,
            COUNT(rl.id) FILTER (
              WHERE 1=1
              ${dateFilterQuery ? `AND rl.created_at ${dateFilterQuery}` : ""}
            ) as likes_this_period
          FROM resource_likes rl
          JOIN resources r ON rl.resource_id = r.id
          WHERE r.is_public = true AND r.deleted_at IS NULL
          GROUP BY r.uploader_id
        ) like_stats ON u.id = like_stats.uploader_id
        
        WHERE u.role = 'STUDENT'
        AND (
          upload_stats.upload_count > 0
          OR us.current_streak > 0
          OR us.flame_score > 0
        )
      )
      SELECT * FROM leaderboard_cte
      ORDER BY points_this_period DESC, flame_score DESC
    `

    const rows = await prisma.$queryRawUnsafe<any[]>(query)

    // Build the format according to the spec
    const leaderboard = rows.slice(0, 15).map(row => {
      const isCurrent = row.user_id === currentUserId
      return {
        rank: row.rank,
        user_id: row.user_id,
        full_name: row.full_name || row.email.split("@")[0],
        initials: (row.full_name || row.email).split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
        avatar_url: row.avatar_url,
        flame_score: row.flame_score,
        flame_level: row.flame_level,
        current_streak: row.current_streak,
        upload_count: row.upload_count,
        downloads_received: row.downloads_received,
        likes_received: row.likes_received,
        points_this_period: row.points_this_period,
        is_current_user: isCurrent
      }
    })

    // Current user rank
    let current_user = null
    const myRow = rows.find(r => r.user_id === currentUserId)

    if (myRow) {
      const myRank = myRow.rank
      let points_to_next_rank = 0
      let uploads_to_climb = 0
      
      if (myRank > 1) {
        const higherUser = rows.find(r => r.rank === myRank - 1)
        if (higherUser) {
          points_to_next_rank = higherUser.points_this_period - myRow.points_this_period + 1
          uploads_to_climb = Math.ceil(points_to_next_rank / 5.0)
        }
      }

      let motivational_tip = "Keep building your streak daily"
      if (points_to_next_rank === 0) motivational_tip = "You're at the top! 🏆"
      else if (points_to_next_rank <= 20) motivational_tip = "So close! One upload gets you there"
      else if (points_to_next_rank <= 50) motivational_tip = `Upload ${uploads_to_climb} files this week`

      current_user = {
        rank: myRank,
        points: myRow.points_this_period,
        flame_level: myRow.flame_level,
        current_streak: myRow.current_streak,
        points_to_next_rank,
        next_rank_user: null, // Just hiding identity
        uploads_to_climb,
        motivational_tip
      }
    } else if (currentUserId) {
      // User is registered but has NO activity -> not in the rows array
      current_user = {
        rank: null,
        points: 0,
        flame_level: "Starter Flame",
        current_streak: 0,
        points_to_next_rank: 5,
        uploads_to_climb: 1,
        motivational_tip: "Upload your first resource to earn points and appear in rankings!"
      }
    }

    const totalStudents = rows.length

    return NextResponse.json({
      leaderboard,
      current_user,
      total_students: totalStudents,
      period,
      last_updated: new Date().toISOString()
    })

  } catch (error: any) {
    console.error("Leaderboard error:", error)
    return NextResponse.json(
      { error: "Failed to fetch leaderboard", details: error.message },
      { status: 500 }
    )
  }
}
