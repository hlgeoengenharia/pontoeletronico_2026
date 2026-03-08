/**
 * Auth System - Projeto V01
 * Gerencia login, logout e proteção de rotas.
 */

import { supabase } from './supabase-config.js';

const Auth = {
    /**
     * Tenta realizar o login do usuário
     */
    async login(nickname, password) {
        try {
            const { data, error } = await supabase
                .from('funcionarios')
                .select('*, setores(nome)')
                .ilike('nickname', nickname)
                .eq('senha', password)
                .single();

            if (error) {
                if (error.code === 'PGRST116') throw new Error('Credenciais inválidas ou usuário não encontrado.');
                throw error;
            }
            if (!data) throw new Error('Credenciais inválidas.');

            // Salvar no localStorage
            localStorage.setItem('userId', data.id);
            localStorage.setItem('userRole', data.nivel_acesso);
            localStorage.setItem('userName', data.nome_completo);
            localStorage.setItem('userNickname', data.nickname);
            localStorage.setItem('userMatricula', data.matricula);
            localStorage.setItem('userSetor', data.setores?.nome || 'Não definido');
            localStorage.setItem('userSetorId', data.setor_id || '');

            console.log('Login bem-sucedido:', data.nome_completo);
            return { success: true, user: data };
        } catch (err) {
            console.error('Erro detalhado no login:', err);
            return { success: false, error: err.message };
        }
    },

    /**
     * Finaliza a sessão atual
     */
    logout() {
        localStorage.clear();
        window.location.href = 'pagina_login_01.html';
    },

    /**
     * Verifica se existe uma sessão ativa. 
     * Se não existir, redireciona para o login.
     * @param {string[]} allowedRoles Níveis de acesso permitidos (opcional)
     */
    checkSession(allowedRoles = []) {
        const userId = localStorage.getItem('userId');
        const userRole = localStorage.getItem('userRole');

        // Se não estiver logado
        if (!userId) {
            window.location.href = 'pagina_login_01.html';
            return;
        }

        // Se a rota for restrita a certos papéis
        if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
            // Se for gestor tentando acessar admin, ou funcionário tentando acessar gestor
            alert('Acesso negado: Nível de autorização insuficiente.');

            // Redireciona para o respectivo painel
            if (userRole === 'admin') window.location.href = 'painel_admin.html';
            else if (userRole === 'manager' || userRole === 'gestor') window.location.href = 'painel_gestor.html';
            else window.location.href = 'painel_funcionario.html';
        }

        return { userId, userRole };
    },

    /**
     * Retorna os dados do usuário atual
     */
    getUser() {
        return {
            id: localStorage.getItem('userId'),
            role: localStorage.getItem('userRole'),
            name: localStorage.getItem('userName'),
            nickname: localStorage.getItem('userNickname'),
            matricula: localStorage.getItem('userMatricula'),
            setor: localStorage.getItem('userSetor'),
            setorId: localStorage.getItem('userSetorId')
        };
    }
};

export { Auth };
