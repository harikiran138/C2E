-- Performance Optimization Indexes

-- 1. Programs and Institutional Level
CREATE INDEX IF NOT EXISTS idx_programs_institution_id ON programs(institution_id);
CREATE INDEX IF NOT EXISTS idx_programs_created_at ON programs(created_at);

-- 2. Members and Committees (Frequently queried for dashboard counts)
CREATE INDEX IF NOT EXISTS idx_pac_members_program_id ON pac_members(program_id);
CREATE INDEX IF NOT EXISTS idx_bos_members_program_id ON bos_members(program_id);
CREATE INDEX IF NOT EXISTS idx_representative_stakeholders_program_id ON representative_stakeholders(program_id);
CREATE INDEX IF NOT EXISTS idx_academic_council_institution_id ON academic_council(institution_id);
CREATE INDEX IF NOT EXISTS idx_obe_framework_institution_id ON obe_framework(institution_id);

-- 3. Program Specific Details
CREATE INDEX IF NOT EXISTS idx_program_coordinators_program_id ON program_coordinators(program_id);
CREATE INDEX IF NOT EXISTS idx_program_vmp_versions_program_id ON program_vmp_versions(program_id);
CREATE INDEX IF NOT EXISTS idx_program_vmp_versions_is_final ON program_vmp_versions(is_final) WHERE is_final = true;

-- 4. Outcomes (PEOs, POs, PSOs)
CREATE INDEX IF NOT EXISTS idx_program_peos_program_id ON program_peos(program_id);
CREATE INDEX IF NOT EXISTS idx_program_outcomes_program_id ON program_outcomes(program_id);
CREATE INDEX IF NOT EXISTS idx_program_psos_program_id ON program_psos(program_id);

-- 5. Curriculum and Feedbacks
CREATE INDEX IF NOT EXISTS idx_curriculum_data_program_id ON curriculum_data(program_id);
CREATE INDEX IF NOT EXISTS idx_stakeholders_program_id ON stakeholders(program_id);
CREATE INDEX IF NOT EXISTS idx_stakeholder_feedback_program_id ON stakeholder_feedback(program_id);
