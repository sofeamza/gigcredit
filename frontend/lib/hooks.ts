import useSWR from "swr"
import {
  getScoreHistory,
  getCurrentScore,
  getUserProfiles,
  type ScoreHistoryItem,
  type UserProfileData,
  getAuthToken,
} from "@/lib/api"

// SWR fetcher that checks for auth token
const authenticatedFetcher = async <T>(fetcher: () => Promise<T>): Promise<T> => {
  const token = getAuthToken()
  if (!token) {
    throw new Error("Not authenticated")
  }
  return fetcher()
}

export function useScoreHistory() {
  return useSWR<{ history: ScoreHistoryItem[] }>(
    "score-history",
    () => authenticatedFetcher(getScoreHistory),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )
}

export function useCurrentScore() {
  return useSWR<ScoreHistoryItem | null>(
    "current-score",
    () => authenticatedFetcher(getCurrentScore),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )
}

export function useUserProfiles() {
  return useSWR<UserProfileData[]>(
    "user-profiles",
    () => authenticatedFetcher(getUserProfiles),
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  )
}
