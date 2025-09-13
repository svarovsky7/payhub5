import React from 'react'
import {Button, Result} from 'antd'
import {useNavigate} from 'react-router-dom'

const NotFoundPage: React.FC = () => {
    const navigate = useNavigate()

    const handleBackHome = () => {
        navigate('/dashboard')
    }

    return (<Result
            status="404"
            title="404"
            subTitle="Извините, запрашиваемая страница не найдена."
            extra={
                <Button type="primary" onClick={() => void handleBackHome()}>
                    Вернуться на главную
                </Button>
            }
        />
    )
}

export default NotFoundPage