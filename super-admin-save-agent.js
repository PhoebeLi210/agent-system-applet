        // 保存代理商
        function saveAgent() {
            const agentName = document.getElementById('agentName').value;

            if (!agentName) {
                alert('请填写代理商名称');
                return;
            }

            const url = currentEditAgentId ? 
                `/api/agents/${currentEditAgentId}` : 
                '/api/agents';
            const method = currentEditAgentId ? 'PUT' : 'POST';

            fetch(url, {
                method: method,
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    agentName: agentName
                })
            })