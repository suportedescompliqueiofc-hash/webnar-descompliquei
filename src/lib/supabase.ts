import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://noncbgdczgcboronmcah.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_om1zqbGZh-RceqKhrEx4SA_rbly1oBB";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
