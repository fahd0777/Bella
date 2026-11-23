-- Demo children renamed to باسل (son) / لوجين (daughter); 003_demo.sql already contains the new names.
update public.children set name = 'باسل' where is_demo and name = 'يوسف';
update public.children set name = 'لوجين' where is_demo and name = 'ليلى';
update public.expenses set description = 'درس رياضيات باسل' where is_demo and description = 'درس رياضيات يوسف';
update public.lessons set teacher_name = 'أ. هالة' where is_demo and teacher_name = 'أ. سلمى';
