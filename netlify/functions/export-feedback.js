const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

exports.handler = async (event, context) => {
    // 验证管理员密码
    const adminPassword = event.headers['x-admin-password'];
    if (adminPassword !== process.env.ADMIN_PASSWORD) {
        return { statusCode: 401, body: JSON.stringify({ success: false, error: 'Unauthorized' }) };
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data, error } = await supabase.from('feedbacks').select('*').order('created_at', { ascending: false });
    if (error) {
        return { statusCode: 500, body: JSON.stringify({ success: false, error: error.message }) };
    }
    return { statusCode: 200, body: JSON.stringify({ success: true, data }) };
};