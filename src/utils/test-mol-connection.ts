import { supabase } from '../services/supabase'

export async function testMOLConnection() {
  console.log('[TEST] Testing МОЛ table connection...')
  
  try {
    // Test 1: Read existing МОЛ
    console.log('[TEST] 1. Testing read operation...')
    const { data: readData, error: readError } = await supabase
      .from('material_responsible_persons')
      .select('*')
      .limit(1)
    
    if (readError) {
      console.error('[TEST] Read error:', readError)
    } else {
      console.log('[TEST] Read success:', readData)
    }
    
    // Test 2: Create new МОЛ
    console.log('[TEST] 2. Testing create operation...')
    const testData = {
      full_name: `Test МОЛ ${Date.now()}`,
      phone: '+7 (000) 000-00-00',
      position: 'Test Position',
      email: 'test@test.com',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    console.log('[TEST] Sending data:', testData)
    
    const { data: createData, error: createError } = await supabase
      .from('material_responsible_persons')
      .insert([testData])
      .select()
      .single()
    
    if (createError) {
      console.error('[TEST] Create error:', createError)
      console.error('[TEST] Error details:', {
        message: createError.message,
        details: createError.details,
        hint: createError.hint,
        code: createError.code
      })
    } else {
      console.log('[TEST] Create success:', createData)
      
      // Test 3: Delete test МОЛ
      if (createData?.id) {
        console.log('[TEST] 3. Cleaning up test data...')
        const { error: deleteError } = await supabase
          .from('material_responsible_persons')
          .delete()
          .eq('id', createData.id)
        
        if (deleteError) {
          console.error('[TEST] Delete error:', deleteError)
        } else {
          console.log('[TEST] Cleanup successful')
        }
      }
    }
    
    console.log('[TEST] Connection test completed')
    return { success: true }
  } catch (error) {
    console.error('[TEST] Unexpected error:', error)
    return { success: false, error }
  }
}

// Auto-run test on import (for debugging)
if (typeof window !== 'undefined') {
  (window as any).testMOLConnection = testMOLConnection
  console.log('[TEST] Test function registered. Run testMOLConnection() in console to test.')
}