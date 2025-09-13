/**
 * Contractors Administration Component
 * Manages contractors and contractor types
 */

import React, { useState } from 'react'
import { Card, Tabs } from 'antd'
import { TagOutlined, TeamOutlined } from '@ant-design/icons'
import { useContractorsData, useContractorTypes } from './hooks/useContractorsAdmin'
import { ContractorsListTab } from './components/ContractorsListTab'
import { ContractorTypesTab } from './components/ContractorTypesTab'

export const ContractorsAdmin: React.FC = () => {
  const [activeTab, setActiveTab] = useState('contractors')

  // Contractors data
  const {
    contractors,
    contractorsResponse,
    loadingContractors,
    refetchContractors,
    contractorFilters,
    setContractorFilters,
    contractorPagination,
    setContractorPagination,
    handleCreateContractor,
    handleUpdateContractor,
    handleDeleteContractor,
    handleToggleContractorStatus
  } = useContractorsData()

  // Contractor types data
  const {
    contractorTypes,
    loadingTypes,
    loadContractorTypes,
    handleCreateType,
    handleUpdateType,
    handleDeleteType
  } = useContractorTypes()

  const tabItems = [
    {
      key: 'contractors',
      label: (
        <span>
          <TeamOutlined />
          Контрагенты
        </span>
      ),
      children: (
        <ContractorsListTab
          contractors={contractors}
          contractorsResponse={contractorsResponse}
          loadingContractors={loadingContractors}
          refetchContractors={refetchContractors}
          contractorFilters={contractorFilters}
          setContractorFilters={setContractorFilters}
          contractorPagination={contractorPagination}
          setContractorPagination={setContractorPagination}
          contractorTypes={contractorTypes}
          onCreateContractor={(values) => handleCreateContractor(values)}
          onUpdateContractor={(id, values) => handleUpdateContractor(id, values)}
          onDeleteContractor={(id) => handleDeleteContractor(id)}
          onToggleStatus={(contractor) => handleToggleContractorStatus(contractor)}
        />
      )
    },
    {
      key: 'types',
      label: (
        <span>
          <TagOutlined />
          Типы контрагентов
        </span>
      ),
      children: (
        <ContractorTypesTab
          contractorTypes={contractorTypes}
          loadingTypes={loadingTypes}
          onRefresh={() => void loadContractorTypes()}
          onCreateType={(values) => handleCreateType(values)}
          onUpdateType={(id, values) => handleUpdateType(id, values)}
          onDeleteType={(id) => handleDeleteType(id)}
        />
      )
    }
  ]

  return (
    <div>
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />
      </Card>
    </div>
  )
}

export default ContractorsAdmin